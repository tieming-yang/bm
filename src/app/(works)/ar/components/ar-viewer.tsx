"use client";

import { toast } from "sonner";
import { Bounds, Center, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import Loading from "@/app/loading";
import logger from "@/utils/logger";
import { Button } from "@/components/ui/button";
import { useStableTranslation } from "@/hooks/use-translation";
import { AR, Model } from "../data";
import Config from "@/models/config";
import { getR2URL } from "@/utils/get-r2-path";

type MindArSceneElement = HTMLElement & {
  systems?: {
    "mindar-image-system"?: {
      stop?: () => void;
    };
  };
};

/**
 * @description
camera <video> z-0
  shows the real-world camera feed

A-Frame <canvas> z-1
  transparent WebGL layer
  draws the tracked plane, box, text

React controls z-50
  buttons/status UI

MindAR scan UI z-60
  scan-frame overlay
 */
export default function ARViewer({
  arData,
  targetURL,
  modelURL,
}: {
  arData: AR;
  targetURL: string;
  modelURL?: string;
}) {
  const sceneRef = useRef<MindArSceneElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const { t, stableT } = useStableTranslation("ar");
  const hasAutoStartedRef = useRef(false);
  const [librariesReady, setLibrariesReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [scanUiEnabled, setScanUiEnabled] = useState(true);
  const scanUiEnabledRef = useRef(true);
  const [status, setStatus] = useState(() => stableT("ar.viewer.status.loadingLibraries"));
  logger({ status });

  const [targetUnlocked, setTargetUnlocked] = useState(false);
  const targetUnlockedRef = useRef(false);

  const [cameraError, setCameraError] = useState(false);

  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);
  const targetRefs = useRef<(HTMLElement | null)[]>([]);
  const targetEntries = arData.items.map((item, index) => {
    return React.createElement("a-entity", {
      key: item.modelId,
      ref: (el: HTMLElement | null) => {
        targetRefs.current[index] = el;
      },
      "mindar-image-target": `targetIndex: ${index}`,
    });
  });

  useEffect(() => {
    let mounted = true;

    async function loadMindAr() {
      try {
        await import("aframe");
        await import("mind-ar/dist/mindar-image-aframe.prod.js");

        if (!mounted) return;
        setLibrariesReady(true);
        setStatus(stableT("ar.viewer.status.ready"));
      } catch (error) {
        console.error("Failed to load MindAR", error);
        if (mounted) setStatus(stableT("ar.viewer.status.failedToLoadLibraries"));
      }
    }

    loadMindAr();

    return () => {
      mounted = false;
      removeMindArUiOverlays();
      stopCameraVideos(sceneRef.current?.parentElement);
    };
  }, [stableT]);

  const startAR = React.useCallback(async () => {
    setCameraError(false);

    if (!window.isSecureContext) {
      setStatus(
        stableT("ar.viewer.status.cameraRequiresSecureOrigin", {
          origin: window.location.origin,
        })
      );
      setCameraError(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(stableT("ar.viewer.status.browserUnsupported"));
      setCameraError(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      stream.getTracks().forEach((track) => track.stop());

      setStatus(stableT("ar.viewer.status.startingCamera"));
      removeMindArUiOverlays();
      setStarted(true);
    } catch (error) {
      const message = stableT("ar.viewer.status.cameraUnavailable");
      setStatus(message);
      toast.error(message);

      setCameraError(true);
    }
  }, [stableT]);
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    startAR();
  }, [startAR]);

  useEffect(() => {
    if (!started || !sceneRef.current) return;

    const scene = sceneRef.current;

    const handleReady = () => {
      setMindArScanningOverlay(scanUiEnabledRef.current);
      setStatus(stableT("ar.viewer.status.pointAtTarget"));
    };
    const handleError = () => setStatus(stableT("ar.viewer.status.cameraFailed"));

    scene.addEventListener("arReady", handleReady);
    scene.addEventListener("arError", handleError);
    setMindArScanningOverlay(scanUiEnabledRef.current);

    return () => {
      scene.removeEventListener("arReady", handleReady);
      scene.removeEventListener("arError", handleError);

      try {
        scene.systems?.["mindar-image-system"]?.stop?.();
        setStatus(stableT("ar.viewer.status.mindARStopped"));
      } catch (error) {
        console.warn("MindAR cleanup failed", error);
      }

      removeMindArUiOverlays();
      stopCameraVideos(scene.parentElement);
    };
  }, [started, stableT]);

  useEffect(() => {
    scanUiEnabledRef.current = scanUiEnabled;
    if (!started) return;
    setMindArScanningOverlay(scanUiEnabled);
  }, [started, scanUiEnabled]);

  useEffect(() => {
    if (!started) return;

    const cleanups = arData.items.map((item, index) => {
      const el = targetRefs.current[index];
      if (!el) return () => {};

      const handleFound = () => {
        setActiveTargetIndex(index);
        setTargetUnlocked(true);
        targetUnlockedRef.current = true;
        setScanUiEnabled(false);
        scanUiEnabledRef.current = false;
        setMindArScanningOverlay(false);
        setStatus(stableT("ar.viewer.status.targetUnlocked"));
      };

      const handleLost = () => {
        if (targetUnlockedRef.current) {
          setStatus(stableT("ar.viewer.status.modelUnlocked"));
          return;
        }

        setStatus(stableT("ar.viewer.status.targetLost"));
      };

      el.addEventListener("targetFound", handleFound);
      el.addEventListener("targetLost", handleLost);

      return () => {
        el.removeEventListener("targetFound", handleFound);
        el.removeEventListener("targetLost", handleLost);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [started, arData]);

  const activeDataItem = activeTargetIndex !== null ? arData.items[activeTargetIndex] : null;
  const activeModelURL = activeDataItem ? getR2URL(activeDataItem.modelPath) : null;

  console.debug("🔎", { activeDataItem });

  const isLoading = !librariesReady;

  return (
    <main className="fixed inset-0 z-50 overflow-hidden text-white bg-black">
      <Loading show={isLoading} />
      <div className="relative w-full overflow-hidden bg-transparent ar-camera-stage isolate h-dvh">
        {!started ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
            <p className="max-w-sm text-sm text-white/80">{status}</p>
          </div>
        ) : (
          React.createElement(
            "a-scene",
            {
              ref: sceneRef,
              "mindar-image": [
                `imageTargetSrc: ${targetURL}`,
                "maxTrack: 1",
                "warmupTolerance: 3",
                "missTolerance: 5",
                "uiError: no",
              ].join("; "),
              "vr-mode-ui": "enabled: false",
              "device-orientation-permission-ui": "enabled: false",
              "loading-screen": "enabled: true",
              renderer: "colorManagement: true; alpha: true",
              // embedded: "true",
              style: {
                position: "absolute",
                inset: 0,
                zIndex: 1,
                height: "100%",
                width: "100%",
                background: "transparent",
              },
            },
            React.createElement("a-camera", {
              position: "0 0 0",
              "look-controls": "enabled: false",
            }),
            ...targetEntries
          )
        )}
        {targetUnlocked && activeModelURL ? (
          <UnlockedModelOverlay modelURL={activeModelURL} />
        ) : null}
      </div>

      {/* Controls */}
      <div className="absolute bottom-20 right-5">
        <div>
          {cameraError && (
            <Button type="button" onClick={startAR}>
              {t("ar.viewer.actions.tryAgain")}
            </Button>
          )}
          {activeTargetIndex !== null && (
            <Button
              type="button"
              onClick={() => {
                setActiveTargetIndex(null);
                setTargetUnlocked(false);
                targetUnlockedRef.current = false;
                setScanUiEnabled(true);
                scanUiEnabledRef.current = true;
                setMindArScanningOverlay(true);
                setStatus("reopen scanner");
              }}
            >
              {t("ar.viewer.actions.rescan")}
            </Button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .ar-camera-stage video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center center !important;
          z-index: 0 !important;
          pointer-events: none !important;
        }

        .ar-camera-stage a-scene,
        .ar-camera-stage a-scene canvas {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: transparent !important;
        }

        .ar-camera-stage a-scene canvas {
          z-index: 1 !important;
        }
      `}</style>
    </main>
  );
}

const MODEL_FACE_USER_Y_ROTATION = -Math.PI / 2;
function UnlockedModelOverlay({ modelURL }: { modelURL: string }) {
  const interactionRef = useRef({
    activePointers: new Map<number, { x: number; y: number }>(),
    lastX: 0,
    lastY: 0,
    pinchStartDistance: 0,
    pinchStartScale: 1,
  });
  const [rotation, setRotation] = useState({ x: 0, y: MODEL_FACE_USER_Y_ROTATION });
  const [scale, setScale] = useState(1);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = interactionRef.current.activePointers;

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.size === 1) {
      interactionRef.current.lastX = event.clientX;
      interactionRef.current.lastY = event.clientY;
    }

    if (pointers.size === 2) {
      interactionRef.current.pinchStartDistance = getPointerDistance(pointers);
      interactionRef.current.pinchStartScale = scale;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = interactionRef.current.activePointers;

    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.size === 2) {
      const currentDistance = getPointerDistance(pointers);
      const startDistance = interactionRef.current.pinchStartDistance;

      if (startDistance > 0) {
        const nextScale =
          interactionRef.current.pinchStartScale * (currentDistance / startDistance);
        setScale(clamp(nextScale, 0.5, 3));
      }

      return;
    }

    if (pointers.size !== 1) return;

    const deltaX = event.clientX - interactionRef.current.lastX;
    const deltaY = event.clientY - interactionRef.current.lastY;

    interactionRef.current.lastX = event.clientX;
    interactionRef.current.lastY = event.clientY;

    setRotation((current) => ({
      x: clamp(current.x + deltaY * 0.01, -0.8, 0.8),
      y: current.y + deltaX * 0.01,
    }));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = interactionRef.current.activePointers;

    pointers.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (pointers.size === 1) {
      const [remainingPointer] = Array.from(pointers.values());
      interactionRef.current.lastX = remainingPointer.x;
      interactionRef.current.lastY = remainingPointer.y;
    }

    if (pointers.size < 2) {
      interactionRef.current.pinchStartDistance = 0;
      interactionRef.current.pinchStartScale = scale;
    }
  };

  return (
    <div
      className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
        }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <React.Suspense fallback={null}>
          <Center>
            <RotatingGLB modelURL={modelURL} rotation={rotation} scale={scale} />
          </Center>
        </React.Suspense>
      </Canvas>
    </div>
  );
}

function RotatingGLB({
  modelURL,
  rotation,
  scale,
}: {
  modelURL: string;
  rotation: { x: number; y: number };
  scale: number;
}) {
  const { scene } = useGLTF(modelURL);

  useEffect(() => {
    console.debug("R3F AR model loaded", { modelURL });
  }, [modelURL]);

  return (
    <group rotation={[rotation.x, rotation.y, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPointerDistance(pointers: Map<number, { x: number; y: number }>) {
  const [firstPointer, secondPointer] = Array.from(pointers.values());

  if (!firstPointer || !secondPointer) return 0;

  return Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y);
}

function setMindArScanningOverlay(enabled: boolean) {
  document.querySelectorAll<HTMLElement>(".mindar-ui-scanning").forEach((overlay) => {
    overlay.style.setProperty("position", "fixed", "important");
    overlay.style.setProperty("inset", "0", "important");
    overlay.style.setProperty("z-index", "60", "important");
    overlay.style.setProperty("pointer-events", "none", "important");

    if (enabled) {
      overlay.style.removeProperty("display");
    } else {
      overlay.style.setProperty("display", "none", "important");
    }
  });
}

function removeMindArUiOverlays() {
  document
    .querySelectorAll<HTMLElement>(".mindar-ui-overlay")
    .forEach((overlay) => overlay.remove());
}

function stopCameraVideos(container?: HTMLElement | null) {
  container?.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
    const stream = video.srcObject;

    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    video.remove();
  });
}
