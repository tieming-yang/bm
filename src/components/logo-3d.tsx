"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const LOGO_URL = "/logos/logo-metalic.webp";
export default function Logo3D() {
  const rotationTargetRef = useRef({
    x: 0,
    y: 0,
    z: 0,
  });

  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  return (
    <div
      className="h-svh w-full touch-none bg-background"
      onPointerDown={(event) => {
        draggingRef.current = true;
        lastPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;

        const dx = event.clientX - lastPointerRef.current.x;
        const dy = event.clientY - lastPointerRef.current.y;

        rotationTargetRef.current.y += dx * 0.006;
        rotationTargetRef.current.x += dy * 0.006;

        lastPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
    >
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <LogoParticleObject imageUrl={LOGO_URL} rotationTargetRef={rotationTargetRef} />
      </Canvas>
    </div>
  );
}

function LogoParticles({
  data,
  rotationTargetRef,
}: {
  data: LogoParticleData;
  rotationTargetRef: React.RefObject<{ x: number; y: number; z: number }>;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const groupRef = useRef<THREE.Group>(null);
  const particleTexture = useMemo(createCircleParticleTexture, []);

  useEffect(() => {
    return () => {
      particleTexture.dispose();
    };
  }, [particleTexture]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute("random", new THREE.BufferAttribute(data.randoms, 1));

    geo.computeBoundingSphere();

    return geo;
  }, [data]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const points = pointsRef.current;

    if (group) {
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, rotationTargetRef.current.x, 0.16);

      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, rotationTargetRef.current.y, 0.16);

      group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, rotationTargetRef.current.z, 0.16);
    }

    if (points) {
      const elapsed = clock.getElapsedTime();
      const pulse = Math.sin(elapsed * 1.2) * 0.5 + 0.5;

      points.scale.setScalar(1 + pulse * 0.025);

      const material = points.material as THREE.PointsMaterial;
      material.size = 0.036 + pulse * 0.018;
      material.opacity = 0.84 + pulse * 0.16;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.25, 0, -0.12]}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          map={particleTexture}
          size={0.04}
          vertexColors
          transparent
          alphaTest={0.01}
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function LogoParticleObject({
  imageUrl,
  rotationTargetRef,
}: {
  imageUrl: string;
  rotationTargetRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
}) {
  const [particleData, setParticleData] = useState<LogoParticleData | null>(null);
  useEffect(() => {
    let cancelled = false;
    createLogoParticle(imageUrl).then((data) => {
      if (!cancelled) {
        setParticleData(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  if (particleData === null) return null;
  return <LogoParticles data={particleData} rotationTargetRef={rotationTargetRef} />;
}

function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });
}

type LogoParticleData = {
  positions: Float32Array;
  colors: Float32Array;
  randoms: Float32Array;
  count: number;
};

async function createLogoParticle(imageUrl: string): Promise<LogoParticleData> {
  const image = await loadImage(imageUrl);

  const sampleSize = 300;
  const logoScale = 4.4;
  const step = 2;

  const canvas = document.createElement("canvas");
  canvas.height = sampleSize;
  canvas.width = sampleSize;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const pixels = imageData.data;

  const positions: number[] = [];
  const colors: number[] = [];
  const randoms: number[] = [];

  for (let y = 0; y < sampleSize; y += step) {
    for (let x = 0; x < sampleSize; x += step) {
      const index = (y * sampleSize + x) * 4;

      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];

      // Prefer alpha if available. Fall back to brightness if the image has no transparency.
      const belongsToLogo = a > 40;

      if (!belongsToLogo) continue;

      const normalizedX = x / sampleSize - 0.5;
      const normalizedY = 0.5 - y / sampleSize;

      const px = normalizedX * logoScale;
      const py = normalizedY * logoScale;

      const depthCopies = 3;
      const particleColor = createPoppedParticleColor(r, g, b, a);

      for (let i = 0; i < depthCopies; i++) {
        const pz = (Math.random() - 0.5) * 0.75;

        positions.push(px, py, pz);

        colors.push(particleColor.r, particleColor.g, particleColor.b);

        randoms.push(Math.random());
      }

      // Gives the flat logo a subtle 3D thickness.
      const pz = (Math.random() - 0.5) * 0.55;

      positions.push(px, py, pz);

      colors.push(particleColor.r, particleColor.g, particleColor.b);

      randoms.push(Math.random());
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    randoms: new Float32Array(randoms),
    count: positions.length / 3,
  };
}

function createPoppedParticleColor(r: number, g: number, b: number, a: number) {
  const color = new THREE.Color(r / 255, g / 255, b / 255);
  const hsl = { h: 0, s: 0, l: 0 };

  color.getHSL(hsl);

  const alpha = a / 255;
  const brightness = (r + g + b) / 3 / 255;

  if (hsl.s < 0.12) {
    color.setHSL(0.56, 0.9, Math.min(0.28 + brightness * 1.45, 1));
  } else {
    color.setHSL(hsl.h, Math.min(hsl.s * 2.2, 1), Math.min(hsl.l * 1.7, 1));
  }

  color.multiplyScalar(1.15 + alpha * 0.45);

  color.r = Math.min(color.r, 1);
  color.g = Math.min(color.g, 1);
  color.b = Math.min(color.b, 1);

  return color;
}

function createCircleParticleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  const center = size / 2;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create particle texture context");
  }

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.55, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}
