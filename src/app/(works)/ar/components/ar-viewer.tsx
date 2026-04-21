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

      removeMindArUiOverlays();
      stopCameraVideos(scene.parentElement);
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
    removeMindArUiOverlays();
    setStarted(true);
  };

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
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
                `imageTargetSrc: ${targetURL}`,
                "maxTrack: 1",
                "warmupTolerance: 3",
                "missTolerance: 5",
                "uiError: no",
              ].join("; "),
              "vr-mode-ui": "enabled: false",
              "device-orientation-permission-ui": "enabled: false",
              "loading-screen": "enabled: true",
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
              "a-assets",
              null,
              React.createElement("a-asset-item", {
                id: "3d-model",
                src: modelURL,
              })
            ),
            React.createElement(
              "a-entity",
              {
                ref: targetRef,
                "mindar-image-target": "targetIndex: 0",
              },
              React.createElement(
                "a-entity",
                {
                  position: "0 0 0",
                },
                React.createElement("a-plane", {
                  height: "0.82",
                  width: "1.24",
                  position: "0 0 -0.006",
                  material:
                    "shader: flat; color: #2563eb; opacity: 0.08; transparent: true; depthWrite: false; side: double",
                }),
                React.createElement("a-plane", {
                  height: "0.74",
                  width: "1.14",
                  position: "0 0 -0.004",
                  material:
                    "shader: flat; color: #2563eb; opacity: 0.14; transparent: true; depthWrite: false; side: double",
                }),
                React.createElement("a-plane", {
                  height: "0.69",
                  width: "1.06",
                  position: "0 0 -0.002",
                  material:
                    "shader: flat; color: #2563eb; opacity: 0.22; transparent: true; depthWrite: false; side: double",
                }),
                React.createElement("a-plane", {
                  height: "0.65",
                  width: "1",
                  position: "0 0 0",
                  material:
                    "shader: flat; color: #2563eb; opacity: 0.58; transparent: true; depthWrite: false; side: double",
                })
              ),
              React.createElement("a-gltf-model", {
                src: "#3d-model",
                position: "0 0 0.16",
                rotation: "0 0 0",
                scale: "1 1 1",
                animation: "property: rotation; to: 0 360 0; loop: true; dur: 6000; easing: linear",
              })
            )
          )
        )}

        {started ? (
          <div className="absolute bottom-17 right-5 z-20">
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
