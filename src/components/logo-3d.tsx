"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const touchGestureRef = useRef<"pending" | "dragging" | "scrolling">("pending");

  return (
    <div
      className="relative h-svh w-full touch-pan-y overflow-hidden bg-[#08070c]"
      onPointerDown={(event) => {
        const pointer = {
          x: event.clientX,
          y: event.clientY,
        };

        draggingRef.current = event.pointerType !== "touch";
        touchGestureRef.current = event.pointerType === "touch" ? "pending" : "dragging";
        pointerStartRef.current = pointer;
        lastPointerRef.current = {
          x: pointer.x,
          y: pointer.y,
        };

        if (event.pointerType !== "touch") {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        touchGestureRef.current = "pending";

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        touchGestureRef.current = "pending";
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "touch" && touchGestureRef.current === "pending") {
          const totalDx = event.clientX - pointerStartRef.current.x;
          const totalDy = event.clientY - pointerStartRef.current.y;
          const isScrollGesture = Math.abs(totalDy) > 8 && Math.abs(totalDy) > Math.abs(totalDx);
          const isDragGesture = Math.abs(totalDx) > 8 && Math.abs(totalDx) > Math.abs(totalDy);

          if (isScrollGesture) {
            draggingRef.current = false;
            touchGestureRef.current = "scrolling";
            return;
          }

          if (isDragGesture) {
            draggingRef.current = true;
            touchGestureRef.current = "dragging";
            lastPointerRef.current = {
              x: event.clientX,
              y: event.clientY,
            };
          }
        }

        if (!draggingRef.current || touchGestureRef.current === "scrolling") return;

        const dx = event.clientX - lastPointerRef.current.x;
        const dy = event.clientY - lastPointerRef.current.y;

        rotationTargetRef.current.y += dx * 0.006;

        if (event.pointerType !== "touch") {
          rotationTargetRef.current.x += dy * 0.006;
        }

        lastPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
    >
      <style>
        {`
          .logo-3d-wave {
            position: absolute;
            inset: -35%;
            opacity: 1;
            filter: blur(100px);
            mix-blend-mode: screen;
            pointer-events: none;
            will-change: transform, opacity;
            background:
              radial-gradient(ellipse at 16% 82%, rgba(168, 85, 247, 0.42), transparent 28%),
              radial-gradient(ellipse at 42% 62%, rgba(59, 130, 246, 0.34), transparent 30%),
              radial-gradient(ellipse at 70% 46%, rgba(14, 165, 233, 0.4), transparent 28%),
              linear-gradient(38deg, transparent 26%, rgba(168, 85, 247, 0.3) 39%, rgba(59, 130, 246, 0.28) 52%, rgba(14, 165, 233, 0.3) 64%, transparent 76%);
            animation: logo-3d-wave-flow 12s linear infinite;
          }

          .logo-3d-wave-secondary {
            filter: blur(90px);
            opacity: 1;
            animation-duration: 18s;
            animation-delay: -6s;
            transform: scale(0.82);
          }

          @keyframes logo-3d-wave-flow {
            0% {
              opacity: 0;
              transform: translate3d(-18%, 18%, 0) rotate(-9deg) scale(0.98);
            }

            16% {
              opacity: 0.64;
            }

            55% {
              opacity: 0.52;
            }

            100% {
              opacity: 0;
              transform: translate3d(18%, -18%, 0) rotate(-9deg) scale(1.08);
            }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,#08070c_0%,#241142_34%,#172554_68%,#075985_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-55 mix-blend-screen bg-[linear-gradient(115deg,transparent_0%,rgba(168,85,247,0.38)_24%,transparent_43%,rgba(59,130,246,0.34)_62%,rgba(14,165,233,0.3)_84%,transparent_100%)]"
      />
      <div aria-hidden="true" className="logo-3d-wave" />
      <div aria-hidden="true" className="logo-3d-wave logo-3d-wave-secondary" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/20 backdrop-blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,12,0.18)_0%,transparent_35%,rgba(8,7,12,0.48)_100%)]"
      />
      <Canvas className="relative z-10" camera={{ position: [0, 0, 7], fov: 45 }}>
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
  const groupRef = useRef<THREE.Group>(null);
  const viewport = useThree((state) => state.viewport);
  const canvasSize = useThree((state) => state.size);
  const particleTexture = useMemo(createCircleParticleTexture, []);
  const logoMotionData = useMemo(() => createLogoMotionData(data), [data]);
  const logoMaterial = useMemo(() => createLogoParticleMaterial(particleTexture), [particleTexture]);
  const responsiveScale = useMemo(() => {
    const fitScale = Math.min(viewport.width / 5.6, viewport.height / 5.6);

    return THREE.MathUtils.clamp(fitScale, 0.42, 1);
  }, [viewport.height, viewport.width]);
  const particleSizeScale = useMemo(() => {
    if (canvasSize.width < 480) return 0.58;
    if (canvasSize.width < 768) return 0.74;

    return 1;
  }, [canvasSize.width]);

  useEffect(() => {
    return () => {
      particleTexture.dispose();
    };
  }, [particleTexture]);

  useEffect(() => {
    return () => {
      logoMaterial.dispose();
    };
  }, [logoMaterial]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("particleColor", new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute("particleSize", new THREE.BufferAttribute(logoMotionData.sizes, 1));
    geo.setAttribute("particlePhase", new THREE.BufferAttribute(logoMotionData.phases, 1));
    geo.setAttribute("particleSpeed", new THREE.BufferAttribute(logoMotionData.speeds, 1));
    geo.setAttribute("driftVector", new THREE.BufferAttribute(logoMotionData.driftVectors, 3));
    geo.setAttribute("driftRadius", new THREE.BufferAttribute(logoMotionData.driftRadii, 1));

    geo.computeBoundingSphere();

    return geo;
  }, [data, logoMotionData]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const elapsed = clock.getElapsedTime();

    if (group) {
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, rotationTargetRef.current.x, 0.16);

      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, rotationTargetRef.current.y, 0.16);

      group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, rotationTargetRef.current.z, 0.16);

      const scale = THREE.MathUtils.lerp(group.scale.x, responsiveScale, 0.14);
      group.scale.setScalar(scale);
    }

    const pulse = Math.sin(elapsed * 1.2) * 0.5 + 0.5;
    logoMaterial.uniforms.time.value = elapsed;
    logoMaterial.uniforms.opacity.value = 0.78 + pulse * 0.16;
    logoMaterial.uniforms.sizeScale.value = particleSizeScale;
  });

  return (
    <group ref={groupRef} rotation={[0.25, 0, -0.12]}>
      <points geometry={geometry} material={logoMaterial} />
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

type LogoMotionData = {
  sizes: Float32Array;
  phases: Float32Array;
  speeds: Float32Array;
  driftVectors: Float32Array;
  driftRadii: Float32Array;
};

async function createLogoParticle(imageUrl: string): Promise<LogoParticleData> {
  const image = await loadImage(imageUrl);

  const sampleSize = 190;
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
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const alpha = a / 255;
  const gray = (red + green + blue) / 3;
  const vibrance = 1.75;
  const contrast = 1.08;
  const exposure = 1.18 + alpha * 0.08;

  const color = new THREE.Color(
    gray + (red - gray) * vibrance,
    gray + (green - gray) * vibrance,
    gray + (blue - gray) * vibrance
  );

  color.r = (color.r - 0.5) * contrast + 0.5;
  color.g = (color.g - 0.5) * contrast + 0.5;
  color.b = (color.b - 0.5) * contrast + 0.5;

  color.multiplyScalar(exposure);

  color.r = THREE.MathUtils.clamp(color.r, 0, 0.96);
  color.g = THREE.MathUtils.clamp(color.g, 0, 0.96);
  color.b = THREE.MathUtils.clamp(color.b, 0, 0.96);

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

function createLogoMotionData(logoData: LogoParticleData): LogoMotionData {
  const count = logoData.count;
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const driftVectors = new Float32Array(count * 3);
  const driftRadii = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const index = i * 3;
    const random = logoData.randoms[i] ?? Math.random();
    const angle = Math.random() * Math.PI * 2;
    const zAngle = Math.random() * Math.PI * 2;

    sizes[i] = 9 + random * 3.6;
    phases[i] = Math.random();
    speeds[i] = 0.08 + Math.random() * 0.18;
    driftRadii[i] = 0.006 + Math.random() * 0.026;

    driftVectors[index] = Math.cos(angle);
    driftVectors[index + 1] = Math.sin(angle);
    driftVectors[index + 2] = Math.sin(zAngle) * 0.55;
  }

  return {
    sizes,
    phases,
    speeds,
    driftVectors,
    driftRadii,
  };
}

function createLogoParticleMaterial(particleTexture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
    uniforms: {
      opacity: { value: 0.88 },
      pointTexture: { value: particleTexture },
      sizeScale: { value: 1 },
      time: { value: 0 },
    },
    vertexShader: `
      uniform float time;
      uniform float sizeScale;

      attribute vec3 particleColor;
      attribute float particleSize;
      attribute float particlePhase;
      attribute float particleSpeed;
      attribute vec3 driftVector;
      attribute float driftRadius;

      varying vec3 vColor;
      varying float vAlpha;

      float smoothCycle(float value) {
        float grow = smoothstep(0.0, 0.36, value);
        float shrink = 1.0 - smoothstep(0.78, 1.0, value);

        return grow * shrink;
      }

      void main() {
        float cycle = fract(time * particleSpeed + particlePhase);
        float sizePulse = smoothCycle(cycle);
        float driftPulse = sin(time * (0.36 + particleSpeed * 2.8) + particlePhase * 6.28318);
        float crossPulse = cos(time * (0.24 + particleSpeed * 1.9) + particlePhase * 9.42477);

        vec3 crossDrift = vec3(-driftVector.y, driftVector.x, driftVector.z * 0.45);
        vec3 animatedPosition = position + driftVector * driftRadius * driftPulse + crossDrift * driftRadius * 0.55 * crossPulse;

        vColor = particleColor;
        vAlpha = 0.18 + sizePulse * 0.82;

        vec4 modelViewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
        gl_Position = projectionMatrix * modelViewPosition;
        gl_PointSize = particleSize * sizeScale * sizePulse * (6.0 / max(0.1, -modelViewPosition.z));
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform sampler2D pointTexture;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 sprite = texture2D(pointTexture, gl_PointCoord);
        float alpha = sprite.a * vAlpha * opacity;

        if (alpha < 0.01) {
          discard;
        }

        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });
}
