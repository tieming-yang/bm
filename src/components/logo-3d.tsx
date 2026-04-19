"use client";

import { Points } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const LOGO_URL = "/logos/logo-metalic.webp";
export default function Logo3D() {
  return (
    <div className="h-svh w-full bg-background">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <LogoParticleObject imageUrl={LOGO_URL} />
      </Canvas>
    </div>
  );
}

function LogoParticles({ data }: { data: LogoParticleData }) {
  const pointsRef = useRef<THREE.Points>(null);

  const groupRef = useRef<THREE.Group>(null);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute("random", new THREE.BufferAttribute(data.randoms, 1));

    geo.computeBoundingSphere();

    return geo;
  }, [data]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;

    const elapsed = clock.getElapsedTime();
    const pulse = Math.sin(elapsed * 2.2) * 0.5 + 0.5;

    points.scale.setScalar(1 + pulse * 0.025);

    const material = points.material as THREE.PointsMaterial;
    material.size = 0.022 + pulse * 0.01;
    material.opacity = 0.62 + pulse * 0.22;
  });

  return (
    <group
      ref={groupRef}
      rotation={[0.25, 0, -0.12]}
      onPointerDown={(event) => {
        draggingRef.current = true;
        lastPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current || !groupRef.current) return;

        const dx = event.clientX - lastPointerRef.current.x;
        const dy = event.clientY - lastPointerRef.current.y;

        groupRef.current.rotation.z += dx * 0.006;
        groupRef.current.rotation.x += dy * 0.006;

        lastPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
    >
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.6}
          vertexColors
          transparent
          opacity={0.78}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function LogoParticleObject({ imageUrl }: { imageUrl: string }) {
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
  return <LogoParticles data={particleData} />;
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

  const sampleSize = 220;
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

  const logoScale = 4.4;
  const step = 2;

  for (let y = 0; y < sampleSize; y += step) {
    for (let x = 0; x < sampleSize; x += step) {
      const index = (y * sampleSize + x) * 4;

      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];

      const brightness = (r + g + b) / 3;
      // Prefer alpha if available. Fall back to brightness if the image has no transparency.
      const belongsToLogo = a > 40;

      if (!belongsToLogo) continue;

      const normalizedX = x / sampleSize - 0.5;
      const normalizedY = 0.5 - y / sampleSize;

      const px = normalizedX * logoScale;
      const py = normalizedY * logoScale;

      const depthCopies = 3;

      for (let i = 0; i < depthCopies; i++) {
        const pz = (Math.random() - 0.5) * 0.75;

        positions.push(px, py, pz);

        const metallic = 0.55 + Math.random() * 0.45;
        colors.push(metallic, metallic, metallic);

        randoms.push(Math.random());
      }

      // Gives the flat logo a subtle 3D thickness.
      const pz = (Math.random() - 0.5) * 0.55;

      positions.push(px, py, pz);

      const metallic = 0.55 + Math.random() * 0.45;
      colors.push(metallic, metallic, metallic);

      randoms.push(Math.random());
    }
  }

  console.debug("🔎", { positions, colors, randoms });
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    randoms: new Float32Array(randoms),
    count: positions.length / 3,
  };
}
