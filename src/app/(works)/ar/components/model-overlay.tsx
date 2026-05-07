"use client";

import toTitle from "@/utils/to-title";
import { Center, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { BoxIcon, PlayIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
        className="w-full h-full object-contain"
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
  const [showTitleZh, setShowTitleZh] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [shouldBounce, setShouldBounce] = useState(true);
  const [audioRequest, setAudioRequest] = useState<{ token: number; url: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackTokenRef = useRef(0);
  const canToggleLanguage = typeof titleZh === "string" && titleZh.trim().length > 0;
  const englishTitle = toTitle(title);

  useEffect(() => {
    setShowTitleZh(false);
    setShouldBounce(true);
    playbackTokenRef.current += 1;

    if (audioURL) {
      setAudioRequest({ token: playbackTokenRef.current, url: audioURL });
      return;
    }

    setAudioRequest(null);
    setIsAudioPlaying(false);
  }, [audioURL, audioZhURL, modelURL, title, titleZh]);

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!audioElement || !audioRequest) {
      return;
    }

    setIsAudioPlaying(true);
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.load();

    // `HTMLMediaElement.play()` is async and may reject later, even after a newer
    // playback request has already started.
    //
    // Why this matters:
    // 1. We may start English audio.
    // 2. Before that `play()` promise settles, the component may request a different
    //    audio clip (for example after a language toggle or a model reset).
    // 3. Starting the newer clip can cause the older `play()` promise to reject
    //    asynchronously because that earlier playback attempt was interrupted.
    //
    // `playbackTokenRef` is a monotonically increasing "request version".
    // Every new playback request gets a new token and becomes the current one.
    //
    // When a `play()` promise rejects, we only clear `isAudioPlaying` if the failed
    // promise belongs to the latest request. This prevents an outdated rejection
    // from an older clip from unlocking the toggle while a newer clip is currently
    // playing or still starting.
    //
    // In short:
    // - current request fails -> unlock the toggle
    // - old request fails -> ignore it
    const playPromise = audioElement.play();

    if (playPromise) {
      void playPromise.catch(() => {
        if (playbackTokenRef.current === audioRequest.token) {
          setIsAudioPlaying(false);
        }
      });
    }

    return () => {
      audioElement.pause();
      audioElement.currentTime = 0;
    };
  }, [audioRequest]);

  const handleToggle = () => {
    if (isAudioPlaying) return;

    const nextShowTitleZh = !showTitleZh;
    const nextAudioURL = nextShowTitleZh ? audioZhURL : audioURL;

    setShowTitleZh(nextShowTitleZh);
    setShouldBounce(false);
    playbackTokenRef.current += 1;

    if (nextAudioURL) {
      setAudioRequest({ token: playbackTokenRef.current, url: nextAudioURL });
      return;
    }

    setAudioRequest(null);
    setIsAudioPlaying(false);
  };

  return (
    <div className="absolute inset-x-0 z-20 flex justify-center px-4 pointer-events-none top-20">
      <div className="flex flex-col items-center max-w-md text-center">
        {canToggleLanguage ? (
          <button
            type="button"
            aria-pressed={showTitleZh}
            aria-busy={isAudioPlaying}
            disabled={isAudioPlaying}
            className={`relative pointer-events-auto min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 md:min-h-24 ${
              shouldBounce ? "animate-bounce" : ""
            }`}
            style={{ perspective: 1200 }}
            onClick={handleToggle}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={showTitleZh ? `zh-title-${titleZh}` : `en-title-${englishTitle}`}
                initial={{ opacity: 0, y: 16, rotateX: -18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, rotateX: 18, filter: "blur(6px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={
                  showTitleZh
                    ? "block text-4xl text-secondary font-chinese md:text-6xl"
                    : "block text-4xl font-semibold tracking-[0.12em] uppercase text-white md:text-6xl"
                }
                style={{
                  transformOrigin: "50% 50%",
                  textShadow: showTitleZh
                    ? "0 1px 0 rgba(255,255,255,0.35), 0 2px 0 rgba(152,166,138,0.5), 0 8px 18px rgba(0,0,0,0.38)"
                    : "0 1px 0 rgba(241,215,164,0.85), 0 2px 0 rgba(152,166,138,0.72), 0 3px 0 rgba(19,19,19,0.9), 0 14px 28px rgba(0,0,0,0.45)",
                }}
              >
                {showTitleZh ? titleZh : englishTitle}
              </motion.span>
            </AnimatePresence>
          </button>
        ) : (
          <div className="relative flex items-center justify-center min-h-16 md:min-h-24">
            <span
              className="block text-4xl font-semibold tracking-[0.12em] uppercase text-white md:text-6xl"
              style={{
                textShadow:
                  "0 1px 0 rgba(241,215,164,0.85), 0 2px 0 rgba(152,166,138,0.72), 0 3px 0 rgba(19,19,19,0.9), 0 14px 28px rgba(0,0,0,0.45)",
              }}
            >
              {englishTitle}
            </span>
          </div>
        )}
        <audio
          ref={audioRef}
          key={audioRequest?.url ?? "overlay-audio"}
          src={audioRequest?.url ?? undefined}
          className="hidden"
          preload="auto"
          onEnded={() => setIsAudioPlaying(false)}
          onError={() => setIsAudioPlaying(false)}
        />
      </div>
    </div>
  );
}

function VideoToggleButton({ showVideo, onClick }: { showVideo: boolean; onClick: () => void }) {
  return (
    <div className="absolute z-30 bottom-20 left-5">
      <button
        type="button"
        aria-label={showVideo ? "Show 3D model" : "Show video"}
        className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        onClick={onClick}
      >
        {showVideo ? <BoxIcon size={20} /> : <PlayIcon size={20} />}
      </button>
    </div>
  );
}

function RotatingGLB({ modelURL }: { modelURL: string }) {
  const { scene } = useGLTF(modelURL);

  useEffect(() => {
    console.debug("R3F AR model loaded", { modelURL });
  }, [modelURL]);

  return <primitive object={scene} />;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPointerDistance(pointers: Map<number, { x: number; y: number }>) {
  const [firstPointer, secondPointer] = Array.from(pointers.values());

  if (!firstPointer || !secondPointer) return 0;

  return Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y);
}
