"use client";

import { toast } from "sonner";
import React, { useEffect, useRef, useState } from "react";
import Loading from "@/app/loading";
import logger from "@/utils/logger";
import { Button } from "@/components/ui/button";
import { useStableTranslation } from "@/hooks/use-translation";
import { AR } from "../data";
import { getR2URL } from "@/utils/get-r2-path";
import ModelOverlay from "./model-overlay";

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
        {targetUnlocked && activeDataItem && activeModelURL ? (
          <ModelOverlay
            modelURL={activeModelURL}
            title={activeDataItem.title}
            titleZh={activeDataItem.titleZh}
          />
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
