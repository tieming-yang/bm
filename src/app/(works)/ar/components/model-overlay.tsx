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
  zhTitle?: string;
  videoURL?: string;
};

const MODEL_FACE_USER_Y_ROTATION = -Math.PI / 2;

export default function ModelOverlay({ modelURL, title, zhTitle, videoURL }: ModelOverlayProps) {
  const [showVideo, setShowVideo] = useState(false);
  const hasVideo = typeof videoURL === "string" && videoURL.trim().length > 0;

  useEffect(() => {
    setShowVideo(false);
  }, [modelURL, videoURL]);

  return (
    <>
      {showVideo && videoURL ? <OverlayVideo videoURL={videoURL} /> : <FigureModel modelURL={modelURL} />}
      <TitleOverlay title={title} zhTitle={zhTitle} />
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
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <video
        key={videoURL}
        src={videoURL}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function TitleOverlay({ title, zhTitle }: { title: string; zhTitle?: string }) {
  const [showZhTitle, setShowZhTitle] = useState(false);
  const canToggleLanguage = typeof zhTitle === "string" && zhTitle.trim().length > 0;
  const englishTitle = toTitle(title);

  useEffect(() => {
    setShowZhTitle(false);
  }, [title, zhTitle]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        {canToggleLanguage ? (
          <button
            type="button"
            aria-pressed={showZhTitle}
            className="pointer-events-auto relative min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-24"
            style={{ perspective: 1200 }}
            onClick={() => setShowZhTitle((current) => !current)}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={showZhTitle ? `zh-title-${zhTitle}` : `en-title-${englishTitle}`}
                initial={{ opacity: 0, y: 16, rotateX: -18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, rotateX: 18, filter: "blur(6px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={
                  showZhTitle
                    ? "block text-4xl text-secondary font-chinese md:text-6xl"
                    : "block text-4xl font-semibold tracking-[0.12em] uppercase text-white md:text-6xl"
                }
                style={{
                  transformOrigin: "50% 50%",
                  textShadow: showZhTitle
                    ? "0 1px 0 rgba(255,255,255,0.35), 0 2px 0 rgba(152,166,138,0.5), 0 8px 18px rgba(0,0,0,0.38)"
                    : "0 1px 0 rgba(241,215,164,0.85), 0 2px 0 rgba(152,166,138,0.72), 0 3px 0 rgba(19,19,19,0.9), 0 14px 28px rgba(0,0,0,0.45)",
                }}
              >
                {showZhTitle ? zhTitle : englishTitle}
              </motion.span>
            </AnimatePresence>
          </button>
        ) : (
          <div className="relative flex min-h-16 items-center justify-center md:min-h-24">
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
      </div>
    </div>
  );
}

function VideoToggleButton({
  showVideo,
  onClick,
}: {
  showVideo: boolean;
  onClick: () => void;
}) {
  return (
    <div className="absolute bottom-20 right-5 z-30">
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
