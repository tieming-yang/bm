"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bounds, Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import Loading from "@/app/loading";
import type { Group } from "three";

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
  targetURL = "/ar/targets/adam.mind",
  modelURL = "/ar/models/adam.glb",
}: {
  targetURL?: string;
  modelURL?: string;
}) {
  const sceneRef = useRef<MindArSceneElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [librariesReady, setLibrariesReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [scanUiEnabled, setScanUiEnabled] = useState(true);
  const scanUiEnabledRef = useRef(true);
  const [status, setStatus] = useState("Loading AR libraries...");
  console.debug("🔎", { status });

  const [targetUnlocked, setTargetUnlocked] = useState(false);
  const targetUnlockedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadMindAr() {
      try {
        await import("aframe");
        await import("mind-ar/dist/mindar-image-aframe.prod.js");

        if (!mounted) return;
        setLibrariesReady(true);
        setStatus("Ready. Tap Start AR to request camera access.");
      } catch (error) {
        console.error("Failed to load MindAR", error);
        if (mounted) setStatus("Failed to load AR libraries.");
      }
    }

    loadMindAr();

    return () => {
      mounted = false;
      removeMindArUiOverlays();
      stopCameraVideos(sceneRef.current?.parentElement);
    };
  }, []);

  useEffect(() => {
    const startAR = async () => {
      if (!window.isSecureContext) {
        setStatus(`Camera requires HTTPS or localhost. Current origin: ${window.location.origin}`);
        toast.error(status);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus(
          "This browser does not expose camera access. Use Safari on iOS or Chrome on Android."
        );
        toast.error(status);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        stream.getTracks().forEach((track) => track.stop());

        setStatus("Starting camera...");
        removeMindArUiOverlays();
        setStarted(true);
      } catch (error) {
        console.error("Camera preflight failed", error);
        setStatus("Camera not available. Check device and browser permission.");
        toast.error(status);
      }
    };
    startAR();
  }, []);

  const unlockTarget = React.useCallback(() => {
    setTargetUnlocked(true);
    targetUnlockedRef.current = true;
    setScanUiEnabled(false);
    scanUiEnabledRef.current = false;
    setMindArScanningOverlay(false);
    setStatus("Target unlocked. You can move away from the target image.");
  }, []);

  const resetScan = () => {
    setTargetUnlocked(false);
    targetUnlockedRef.current = false;

    setScanUiEnabled(true);
    scanUiEnabledRef.current = true;
    setMindArScanningOverlay(true);
    setStatus("Point the camera at the target image.");
  };

  useEffect(() => {
    if (!started || !sceneRef.current || !targetRef.current) return;

    const scene = sceneRef.current;
    const target = targetRef.current;

    const handleReady = () => {
      revealMindArCamera(scene);
      setMindArScanningOverlay(scanUiEnabledRef.current);
      setStatus("Point the camera at the target image.");
    };
    const handleError = () => setStatus("Camera failed to start. Check browser permission.");
    const handleFound = () => unlockTarget();
    const handleLost = () => {
      if (targetUnlockedRef.current) {
        setStatus("Model unlocked.");
        return;
      }

      setStatus("Target lost. Keep scanning.");
    };

    scene.addEventListener("arReady", handleReady);
    scene.addEventListener("arError", handleError);
    target.addEventListener("targetFound", handleFound);
    target.addEventListener("targetLost", handleLost);

    const revealTimer = window.setTimeout(() => {
      revealMindArCamera(scene);
      setMindArScanningOverlay(scanUiEnabledRef.current);
    }, 500);

    return () => {
      scene.removeEventListener("arReady", handleReady);
      scene.removeEventListener("arError", handleError);
      target.removeEventListener("targetFound", handleFound);
      target.removeEventListener("targetLost", handleLost);
      window.clearTimeout(revealTimer);

      try {
        scene.systems?.["mindar-image-system"]?.stop?.();
        console.debug("🔎", "mindar-image-system stopped");
      } catch (error) {
        console.warn("MindAR cleanup failed", error);
      }

      removeMindArUiOverlays();
      stopCameraVideos(scene.parentElement);
    };
  }, [started, unlockTarget]);

  useEffect(() => {
    scanUiEnabledRef.current = scanUiEnabled;
    if (!started) return;
    setMindArScanningOverlay(scanUiEnabled);
  }, [started, scanUiEnabled]);

  const isLoading = !librariesReady;

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <Loading show={isLoading} />
      <div className="relative isolate h-dvh w-full overflow-hidden bg-transparent">
        {!started ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
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
              embedded: "true",
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
            React.createElement("a-entity", {
              ref: targetRef,
              "mindar-image-target": "targetIndex: 0",
            })
          )
        )}

        {targetUnlocked ? <UnlockedModelOverlay modelURL={modelURL} /> : null}

        <div className="absolute bottom-17 right-5 z-20">
          <div className="flex gap-x-5">
            {started ? (
              <div className="">
                <Button
                  type="button"
                  aria-pressed={!scanUiEnabled}
                  onClick={() => setScanUiEnabled((enabled) => !enabled)}
                >
                  {scanUiEnabled ? "Hide Scan UI" : "Show Scan UI"}
                </Button>
              </div>
            ) : null}
            {targetUnlocked ? (
              <Button type="button" onClick={resetScan}>
                Scan Again
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function UnlockedModelOverlay({ modelURL }: { modelURL: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
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
          <Bounds fit clip observe margin={1.15}>
            <Center>
              <RotatingGLB modelURL={modelURL} />
            </Center>
          </Bounds>
        </React.Suspense>
      </Canvas>
    </div>
  );
}

function RotatingGLB({ modelURL }: { modelURL: string }) {
  const groupRef = useRef<Group | null>(null);
  const { scene } = useGLTF(modelURL);

  useEffect(() => {
    console.debug("R3F AR model loaded", { modelURL });
  }, [modelURL]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function revealMindArCamera(scene: HTMLElement) {
  const container = scene.parentElement;
  const video = container?.querySelector<HTMLVideoElement>("video");
  const canvas = scene.querySelector<HTMLCanvasElement>("canvas");

  if (video) {
    video.style.setProperty("position", "absolute", "important");
    video.style.setProperty("top", "50%", "important");
    video.style.setProperty("left", "50%", "important");
    video.style.setProperty("width", "100%", "important");
    video.style.setProperty("height", "100%", "important");
    video.style.setProperty("object-fit", "cover", "important");
    video.style.setProperty("object-position", "center center", "important");
    video.style.setProperty("transform", "translate(-50%, -50%)", "important");
    video.style.setProperty("z-index", "0", "important");
    video.style.setProperty("pointer-events", "none", "important");
  }

  if (canvas) {
    canvas.style.setProperty("position", "absolute", "important");
    canvas.style.setProperty("inset", "0", "important");
    canvas.style.setProperty("width", "100%", "important");
    canvas.style.setProperty("height", "100%", "important");
    canvas.style.setProperty("background", "transparent", "important");
    canvas.style.setProperty("z-index", "1", "important");
  }
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
