"use client";

import toTitle from "@/utils/to-title";
import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BoxIcon, PlayIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import useTranslation from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { bindNarration, type NarrationStatus } from "@/lib/ar/narration";

type ModelOverlayProps = {
  modelURL: string;
  title: string;
  titleZh?: string;
  videoURL?: string;
  audioURL?: string;
  audioZhURL?: string;
};

const MODEL_FACE_USER_Y_ROTATION = -Math.PI / 2;

export default function ModelOverlay({
  modelURL,
  title,
  titleZh,
  videoURL,
  audioURL,
  audioZhURL,
}: ModelOverlayProps) {
  const [showVideo, setShowVideo] = useState(false);
  const hasVideo = typeof videoURL === "string" && videoURL.trim().length > 0;

  useEffect(() => {
    setShowVideo(false);
  }, [modelURL, videoURL]);

  return (
    <>
      {showVideo && videoURL ? (
        <OverlayVideo videoURL={videoURL} />
      ) : (
        <FigureModel modelURL={modelURL} />
      )}
      <TitleOverlay
        key={modelURL}
        modelURL={modelURL}
        title={title}
        titleZh={titleZh}
        audioURL={audioURL}
        audioZhURL={audioZhURL}
      />
      {hasVideo ? (
        <VideoToggleButton
          showVideo={showVideo}
          onClick={() => setShowVideo((current) => !current)}
        />
      ) : null}
    </>
  );
}

function FigureModel({ modelURL }: { modelURL: string }) {
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
            <group rotation={[rotation.x, rotation.y, 0]} scale={scale}>
              <RotatingGLB modelURL={modelURL} />
            </group>
          </Center>
        </React.Suspense>
      </Canvas>
    </div>
  );
}

function OverlayVideo({ videoURL }: { videoURL: string }) {
  return (
    <div className="absolute bg-transparent inset-0 z-10 flex items-center justify-center pointer-events-none">
      <video
        key={videoURL}
        src={videoURL}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-contain scale-110"
      />
    </div>
  );
}

function TitleOverlay({
  modelURL,
  title,
  titleZh,
  audioURL,
  audioZhURL,
}: {
  modelURL: string;
  title: string;
  titleZh?: string;
  audioURL?: string;
  audioZhURL?: string;
}) {
  const { t, currentLanguage } = useTranslation("ar");
  const reducedMotion = useReducedMotion();
  const appLanguage = currentLanguage === "zh-TW" ? "zh-TW" : "en";
  const [language, setLanguage] = useState(appLanguage);
  const showTitleZh = language === "zh-TW";
  const source = showTitleZh ? audioZhURL : audioURL;
  const [shouldBounce, setShouldBounce] = useState(true);
  const [audioStatus, setAudioStatus] = useState<NarrationStatus | "unavailable">(() => source ? "loading" : "unavailable");
  const audioRef = useRef<HTMLAudioElement>(null);
  const transportRef = useRef<ReturnType<typeof bindNarration> | null>(null);
  const playingIntentRef = useRef(true);
  const displayedTitle = showTitleZh && titleZh ? titleZh : toTitle(title);

  useEffect(() => { setLanguage(appLanguage); }, [appLanguage]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!source || !audio) {
      setAudioStatus("unavailable");
      return;
    }
    const transport = bindNarration(audio, (next) => {
      setAudioStatus(next);
      if (["blocked", "failed", "ended"].includes(next)) playingIntentRef.current = false;
    }, playingIntentRef.current);
    transportRef.current = transport;
    return () => {
      transportRef.current = null;
      transport.dispose();
    };
  }, [source]);

  const isPlaying = audioStatus === "playing" || audioStatus === "loading";
  const message = audioStatus === "unavailable" ? "audioUnavailable" : audioStatus === "blocked" ? "audioBlocked" : audioStatus === "failed" ? "audioFailed" : null;

  return (
    <div className="absolute inset-x-0 z-20 flex justify-center px-4 pointer-events-none top-20">
      <div className="flex flex-col items-center max-w-md gap-3 text-center">
        <button
          type="button"
          aria-label={t("ar.viewer.actions.toggleTitleLanguage")}
          aria-pressed={showTitleZh}
          className={`relative pointer-events-auto min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-24 ${shouldBounce && !reducedMotion ? "animate-bounce" : ""}`}
          style={{ perspective: 1200 }}
          onClick={() => { setLanguage(showTitleZh ? "en" : "zh-TW"); setShouldBounce(false); }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={`${language}-${displayedTitle}`}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, rotateX: -18, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -16, rotateX: 18, filter: "blur(6px)" }}
              transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={showTitleZh ? "block text-4xl font-chinese md:text-6xl" : "block text-4xl font-semibold tracking-[0.12em] uppercase text-white md:text-6xl"}
              style={{ transformOrigin: "50% 50%", textShadow: "0 1px 0 rgba(241,215,164,0.85), 0 2px 0 rgba(152,166,138,0.72), 0 3px 0 rgba(19,19,19,0.9), 0 14px 28px rgba(0,0,0,0.45)" }}
            >{displayedTitle}</motion.span>
          </AnimatePresence>
        </button>
        <div className="flex flex-wrap justify-center gap-2 pointer-events-auto rounded-2xl bg-black/70 p-2">
          <Button type="button" size="sm" disabled={!source} aria-busy={audioStatus === "loading"} onClick={() => {
            setShouldBounce(false);
            playingIntentRef.current = !isPlaying;
            if (isPlaying) transportRef.current?.pause(); else void transportRef.current?.play();
          }}>{isPlaying ? t("ar.viewer.actions.pause") : t("ar.viewer.actions.play")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={!source || audioStatus === "stopped"} onClick={() => {
            playingIntentRef.current = false;
            transportRef.current?.stop();
          }}>{t("ar.viewer.actions.stop")}</Button>
        </div>
        {message && <p role="status" className="rounded-2xl bg-black/80 px-3 py-2 text-sm">{t(`ar.viewer.status.${message}`)}</p>}
        <audio ref={audioRef} key={source ?? "unavailable"} src={source} className="hidden" preload="auto" />
      </div>
    </div>
  );
}

function VideoToggleButton({ showVideo, onClick }: { showVideo: boolean; onClick: () => void }) {
  const { t } = useTranslation("ar");
  return (
    <div className="absolute z-30 bottom-20 left-5">
      <button
        type="button"
        aria-label={showVideo ? t("ar.viewer.actions.showModel") : t("ar.viewer.actions.showVideo")}
        className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        onClick={onClick}
      >
        {showVideo ? <BoxIcon size={20} /> : <PlayIcon size={20} />}
      </button>
    </div>
  );
}

function RotatingGLB({ modelURL }: { modelURL: string }) {
  const reducedMotion = useReducedMotion();
  const { scene } = useGLTF(modelURL);
  const groupRef = useRef<Group>(null);
  const animTimeRef = useRef(0);
  const duration = 2; // 1.2 seconds entry animation
  const rotatoinOffset = -Math.PI * 6;

  // Reset animation whenever the model changes
  useEffect(() => {
    animTimeRef.current = 0;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(reducedMotion ? 1 : 0);
      groupRef.current.rotation.y = reducedMotion ? 0 : rotatoinOffset;
    }
  }, [modelURL, reducedMotion]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (animTimeRef.current < duration) {
      animTimeRef.current = Math.min(animTimeRef.current + delta, duration);
      const t = animTimeRef.current / duration;

      // Cubic ease-out: 1 - (1 - t)^3
      const easeT = 1 - Math.pow(1 - t, 3);

      if (groupRef.current) {
        groupRef.current.scale.set(easeT, easeT, easeT);
        groupRef.current.rotation.y = (1 - easeT) * rotatoinOffset;
      }
    }
  });

  useEffect(() => {
    console.debug("R3F AR model loaded", { modelURL });
  }, [modelURL]);

  return (
    <group ref={groupRef}>
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
