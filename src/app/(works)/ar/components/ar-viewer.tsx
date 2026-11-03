"use client";

import React, { useEffect, useRef, useState } from "react";
import Loading from "@/app/loading";
import { ContentState } from "@/components/ui/content-state";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";
import { startARSession, type ARScene, type ARStartupStatus } from "@/lib/ar/session";
import { AR } from "../data";
import { getR2URL } from "@/utils/get-r2-path";
import ModelOverlay from "./model-overlay";

type ViewerStatus = ARStartupStatus | "loadingLibraries" | "failedToLoadLibraries" | "cameraRequiresSecureOrigin" | "browserUnsupported" | "targetUnlocked";

export default function ARViewer({
  arData,
  targetURL,
  onExit,
}: {
  arData: AR;
  targetURL: string;
  onExit: () => void;
}) {
  const { t } = useTranslation("ar");
  const [attempt, setAttempt] = useState(0);
  const [librariesReady, setLibrariesReady] = useState(false);
  const [status, setStatus] = useState<ViewerStatus>("loadingLibraries");

  useEffect(() => {
    let active = true;
    setLibrariesReady(false);
    setStatus("loadingLibraries");
    void (async () => {
      try {
        await import("aframe");
        await import("mind-ar/dist/mindar-image-aframe.prod.js");
        if (!active) return;
        if (!window.isSecureContext) return setStatus("cameraRequiresSecureOrigin");
        if (!navigator.mediaDevices?.getUserMedia) return setStatus("browserUnsupported");
        setStatus("startingCamera");
        setLibrariesReady(true);
      } catch (error) {
        console.error("Failed to load MindAR", error);
        if (active) setStatus("failedToLoadLibraries");
      }
    })();
    return () => { active = false; };
  }, [attempt]);

  const failed = ["failedToLoadLibraries", "cameraRequiresSecureOrigin", "browserUnsupported", "cameraFailed", "engineTimeout"].includes(status);

  return (
    <div className="fixed inset-0 z-(--layer-dialog) overflow-hidden text-white bg-black" role="region" aria-label={t("ar.page.title")}>
      {librariesReady && !failed && <ARCameraAttempt key={attempt} arData={arData} targetURL={targetURL} onStatus={setStatus} />}
      {failed ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background px-5">
          <ContentState kind="error" title={t(`ar.viewer.status.${status}`, { origin: typeof window === "undefined" ? "" : window.location.origin })} onRetry={() => setAttempt((value) => value + 1)} />
        </div>
      ) : status !== "targetUnlocked" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-6 pointer-events-none">
          {status === "pointAtTarget" ? <div className="h-60 w-60 rounded-3xl border-2 border-white/60" aria-hidden="true" /> : <Loading />}
          <p role="status" className="max-w-sm rounded-2xl bg-black/70 px-4 py-3 text-center text-sm">{t(`ar.viewer.status.${status}`)}</p>
        </div>
      )}
      <Button type="button" variant="outline" className="absolute top-5 right-5 z-40" onClick={onExit}>{t("ar.viewer.actions.exit")}</Button>
    </div>
  );
}

function ARCameraAttempt({ arData: initialData, targetURL: initialTargetURL, onStatus }: { arData: AR; targetURL: string; onStatus: (status: ViewerStatus) => void }) {
  const [{ arData, targetURL }] = useState(() => ({ arData: initialData, targetURL: initialTargetURL }));
  const sceneRef = useRef<ARScene | null>(null);
  const targetRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);
  const { t } = useTranslation("ar");

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let active = true;
    const stop = startARSession(scene, (next) => { if (active) onStatus(next); });
    const cleanups = targetRefs.current.map((target, index) => {
      if (!target) return () => {};
      const found = () => {
        if (!active) return;
        setActiveTargetIndex(index);
        onStatus("targetUnlocked");
      };
      target.addEventListener("targetFound", found);
      return () => target.removeEventListener("targetFound", found);
    });
    return () => {
      active = false;
      cleanups.forEach((cleanup) => cleanup());
      stop();
    };
  }, [arData, onStatus]);

  const item = activeTargetIndex === null ? undefined : arData.items[activeTargetIndex];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-transparent ar-camera-stage isolate">
      {React.createElement("a-scene", {
        ref: sceneRef,
        "mindar-image": `imageTargetSrc: ${targetURL}; maxTrack: 1; warmupTolerance: 3; missTolerance: 5; autoStart: false; uiError: no; uiLoading: no; uiScanning: no`,
        "vr-mode-ui": "enabled: false",
        "device-orientation-permission-ui": "enabled: false",
        "loading-screen": "enabled: false",
        renderer: "colorManagement: true; alpha: true",
        style: { position: "absolute", inset: 0, zIndex: 1, height: "100%", width: "100%", background: "transparent" },
      }, React.createElement("a-camera", { position: "0 0 0", "look-controls": "enabled: false" }),
      ...arData.items.map((entry, index) => React.createElement("a-entity", {
        key: entry.modelId,
        ref: (element: HTMLElement | null) => { targetRefs.current[index] = element; },
        "mindar-image-target": `targetIndex: ${index}`,
      })))}
      {item && <ModelOverlay key={item.modelId} modelURL={getR2URL(item.modelPath)} title={item.title} titleZh={item.titleZh} videoURL={item.videoPath ? getR2URL(item.videoPath) : undefined} audioURL={item.audioPath ? getR2URL(item.audioPath) : undefined} audioZhURL={item.audioPathZh ? getR2URL(item.audioPathZh) : undefined} />}
      {item && <Button type="button" className="absolute bottom-20 right-5 z-30" onClick={() => { setActiveTargetIndex(null); onStatus("pointAtTarget"); }}>{t("ar.viewer.actions.rescan")}</Button>}
      <style jsx global>{`
        .ar-camera-stage > video {
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
        .ar-camera-stage a-scene canvas { z-index: 1 !important; }
      `}</style>
    </div>
  );
}
