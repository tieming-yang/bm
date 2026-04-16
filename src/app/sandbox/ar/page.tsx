"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";

type MindArSceneElement = HTMLElement & {
  systems?: {
    "mindar-image-system"?: {
      stop?: () => void;
    };
  };
};

const targetSrc = "/ar/targets.mind";

function revealMindArCamera(scene: HTMLElement) {
  const container = scene.parentElement;
  const video = container?.querySelector("video");
  const canvas = scene.querySelector("canvas");

  if (video) {
    video.style.zIndex = "0";
    video.style.pointerEvents = "none";
  }

  if (canvas) {
    canvas.style.position = "relative";
    canvas.style.zIndex = "1";
    canvas.style.background = "transparent";
  }
}

function setMindArScanningOverlay(enabled: boolean) {
  document.querySelectorAll<HTMLElement>(".mindar-ui-scanning").forEach((overlay) => {
    if (enabled) {
      overlay.style.removeProperty("display");
    } else {
      overlay.style.setProperty("display", "none", "important");
    }
  });
}

export default function AR() {
  const sceneRef = useRef<MindArSceneElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [librariesReady, setLibrariesReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [scanUiEnabled, setScanUiEnabled] = useState(true);
  const scanUiEnabledRef = useRef(true);
  const [status, setStatus] = useState("Loading AR libraries...");

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
    };
  }, []);

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
    const handleFound = () => setStatus("Target found.");
    const handleLost = () => setStatus("Target lost. Keep scanning.");

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
      } catch (error) {
        console.warn("MindAR cleanup failed", error);
      }
    };
  }, [started]);

  useEffect(() => {
    scanUiEnabledRef.current = scanUiEnabled;
    if (!started) return;
    setMindArScanningOverlay(scanUiEnabled);
  }, [started, scanUiEnabled]);

  const startAr = () => {
    if (!window.isSecureContext) {
      setStatus(`Camera requires HTTPS or localhost. Current origin: ${window.location.origin}`);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(
        "This browser does not expose camera access. Use Safari on iOS or Chrome on Android."
      );
      return;
    }

    setStatus("Starting camera...");
    setStarted(true);
  };

  return (
    <main className="min-h-dvh bg-black text-white">
      <div className="relative isolate h-dvh w-full overflow-hidden bg-transparent">
        {!started ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-sm text-sm text-white/80">{status}</p>
            <Button type="button" disabled={!librariesReady} onClick={startAr}>
              Start AR
            </Button>
          </div>
        ) : (
          React.createElement(
            "a-scene",
            {
              ref: sceneRef,
              "mindar-image": [
                `imageTargetSrc: ${targetSrc}`,
                "maxTrack: 1",
                "warmupTolerance: 3",
                "missTolerance: 5",
                "uiError: no",
              ].join("; "),
              "vr-mode-ui": "enabled: false",
              "device-orientation-permission-ui": "enabled: false",
              "loading-screen": "enabled: false",
              renderer: "colorManagement: true; physicallyCorrectLights: true; alpha: true",
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
            React.createElement(
              "a-entity",
              {
                ref: targetRef,
                "mindar-image-target": "targetIndex: 0",
              },
              React.createElement("a-plane", {
                color: "#2563eb",
                opacity: "0.35",
                position: "0 0 0",
                height: "0.65",
                width: "1",
                rotation: "0 0 0",
              }),
              React.createElement("a-box", {
                color: "#facc15",
                position: "0 0 0.12",
                depth: "0.12",
                height: "0.18",
                width: "0.18",
                rotation: "0 45 0",
                animation: "property: rotation; to: 0 405 0; loop: true; dur: 2200; easing: linear",
              }),
              React.createElement("a-text", {
                value: "MindAR Test",
                align: "center",
                color: "#ffffff",
                position: "0 -0.42 0.03",
                width: "1.4",
              })
            )
          )
        )}

        {started ? (
          <div className="absolute bottom-5 right-5 z-20">
            <Button
              type="button"
              aria-pressed={!scanUiEnabled}
              onClick={() => setScanUiEnabled((enabled) => !enabled)}
            >
              {scanUiEnabled ? "Hide Scan UI" : "Show Scan UI"}
            </Button>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-black/70 px-4 py-3 backdrop-blur">
          <h1 className="text-base font-semibold text-white">AR Sandbox</h1>
          <p className="mt-1 font-mono text-xs text-white/75">{status}</p>
        </div>
      </div>
    </main>
  );
}
