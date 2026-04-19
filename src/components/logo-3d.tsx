"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const LOGO_URL = "/logos/logo-metalic.webp";
const STEAM_STREAMS = [
  {
    source: [-5.8, -2.2, -1.1],
    controlA: [-4.8, -1.5, 0.9],
    controlB: [-2.5, -0.5, 0.4],
    tint: [0.35, 0.85, 1],
  },
  {
    source: [-5.6, 2.3, 0.8],
    controlA: [-4.4, 1.8, -0.7],
    controlB: [-2.1, 0.6, -0.2],
    tint: [0.75, 0.45, 1],
  },
  {
    source: [5.7, -1.8, 1],
    controlA: [4.6, -1.1, -0.8],
    controlB: [2.3, -0.4, 0.1],
    tint: [1, 0.55, 0.75],
  },
  {
    source: [5.4, 2.4, -0.9],
    controlA: [4.2, 1.8, 0.8],
    controlB: [2.2, 0.5, 0.3],
    tint: [0.55, 1, 0.85],
  },
  {
    source: [0.2, 5, 0.4],
    controlA: [-0.8, 4, -0.9],
    controlB: [-0.2, 2.1, 0.2],
    tint: [0.6, 0.7, 1],
  },
] as const;

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
  const logoMotionData = useMemo(() => createLogoMotionData(data), [data]);
  const logoMaterial = useMemo(() => createLogoParticleMaterial(particleTexture), [particleTexture]);

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
    }

    const pulse = Math.sin(elapsed * 1.2) * 0.5 + 0.5;
    logoMaterial.uniforms.time.value = elapsed;
    logoMaterial.uniforms.opacity.value = 0.78 + pulse * 0.16;
  });

  return (
    <group ref={groupRef} rotation={[0.25, 0, -0.12]}>
      <SteamParticleStreams logoData={data} particleTexture={particleTexture} />
      <points ref={pointsRef} geometry={geometry} material={logoMaterial} />
    </group>
  );
}

function SteamParticleStreams({
  logoData,
  particleTexture,
}: {
  logoData: LogoParticleData;
  particleTexture: THREE.Texture;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const streamData = useMemo(() => createSteamParticleData(logoData), [logoData]);
  const steamMaterial = useMemo(() => createSteamParticleMaterial(particleTexture), [particleTexture]);

  useEffect(() => {
    return () => {
      steamMaterial.dispose();
    };
  }, [steamMaterial]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(streamData.positions, 3));
    geo.setAttribute("particleColor", new THREE.BufferAttribute(streamData.colors, 3));
    geo.setAttribute("particleSize", new THREE.BufferAttribute(streamData.sizes, 1));
    geo.computeBoundingSphere();

    return geo;
  }, [streamData]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;

    const elapsed = clock.getElapsedTime();
    const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colorAttribute = geometry.getAttribute("particleColor") as THREE.BufferAttribute;
    const sizeAttribute = geometry.getAttribute("particleSize") as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const sizes = sizeAttribute.array as Float32Array;

    for (let i = 0; i < streamData.count; i++) {
      const index = i * 3;
      const progress = (elapsed * streamData.speeds[i] + streamData.offsets[i]) % 1;
      const eased = progress * progress * (3 - 2 * progress);
      const spread = (1 - eased) * streamData.radii[i] + 0.018;
      const swirl = elapsed * (0.42 + streamData.speeds[i] * 2.4) + streamData.phases[i] + progress * 5;

      const baseX = cubicBezier(
        streamData.sources[index],
        streamData.controlsA[index],
        streamData.controlsB[index],
        streamData.targets[index],
        eased
      );
      const baseY = cubicBezier(
        streamData.sources[index + 1],
        streamData.controlsA[index + 1],
        streamData.controlsB[index + 1],
        streamData.targets[index + 1],
        eased
      );
      const baseZ = cubicBezier(
        streamData.sources[index + 2],
        streamData.controlsA[index + 2],
        streamData.controlsB[index + 2],
        streamData.targets[index + 2],
        eased
      );

      positions[index] = baseX + Math.cos(swirl) * spread * streamData.swirlScales[index];
      positions[index + 1] = baseY + Math.sin(swirl * 1.15) * spread * streamData.swirlScales[index + 1];
      positions[index + 2] = baseZ + Math.cos(swirl * 0.82) * spread * streamData.swirlScales[index + 2];

      const fadeIn = smoothStep(0, 0.12, progress);
      const fadeOut = 1 - smoothStep(0.78, 0.94, progress);
      const sizeGrowth = smoothStep(0.02, 0.28, progress);
      const sizeFade = 1 - smoothStep(0.76, 0.92, progress);
      const dustFlicker = 0.86 + Math.sin(elapsed * streamData.flickerRates[i] + streamData.phases[i]) * 0.14;
      const intensity = (0.1 + Math.pow(progress, 1.15) * 1.05) * fadeIn * fadeOut * dustFlicker;

      colors[index] = streamData.baseColors[index] * intensity;
      colors[index + 1] = streamData.baseColors[index + 1] * intensity;
      colors[index + 2] = streamData.baseColors[index + 2] * intensity;
      sizes[i] = streamData.targetSizes[i] * sizeGrowth * sizeFade * dustFlicker;
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;

    const pulse = Math.sin(elapsed * 1.6) * 0.5 + 0.5;
    steamMaterial.uniforms.opacity.value = 0.5 + pulse * 0.14;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={steamMaterial} frustumCulled={false} />
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

type SteamParticleData = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  baseColors: Float32Array;
  sources: Float32Array;
  controlsA: Float32Array;
  controlsB: Float32Array;
  targets: Float32Array;
  offsets: Float32Array;
  phases: Float32Array;
  radii: Float32Array;
  speeds: Float32Array;
  flickerRates: Float32Array;
  targetSizes: Float32Array;
  swirlScales: Float32Array;
  count: number;
};

async function createLogoParticle(imageUrl: string): Promise<LogoParticleData> {
  const image = await loadImage(imageUrl);

  const sampleSize = 220;
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

    sizes[i] = 3.2 + random * 2.4;
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
      time: { value: 0 },
    },
    vertexShader: `
      uniform float time;

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
        gl_PointSize = particleSize * sizePulse * (6.0 / max(0.1, -modelViewPosition.z));
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

function createSteamParticleData(logoData: LogoParticleData): SteamParticleData {
  const particlesPerStream = 300;
  const count = STEAM_STREAMS.length * particlesPerStream;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const baseColors = new Float32Array(count * 3);
  const sources = new Float32Array(count * 3);
  const controlsA = new Float32Array(count * 3);
  const controlsB = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const offsets = new Float32Array(count);
  const phases = new Float32Array(count);
  const radii = new Float32Array(count);
  const speeds = new Float32Array(count);
  const flickerRates = new Float32Array(count);
  const targetSizes = new Float32Array(count);
  const swirlScales = new Float32Array(count * 3);
  const logoCount = Math.max(1, logoData.positions.length / 3);

  for (let streamIndex = 0; streamIndex < STEAM_STREAMS.length; streamIndex++) {
    const stream = STEAM_STREAMS[streamIndex];

    for (let localIndex = 0; localIndex < particlesPerStream; localIndex++) {
      const particleIndex = streamIndex * particlesPerStream + localIndex;
      const index = particleIndex * 3;
      const logoIndex = Math.floor(Math.random() * logoCount) * 3;
      const targetX = logoData.positions[logoIndex];
      const targetY = logoData.positions[logoIndex + 1];
      const targetZ = logoData.positions[logoIndex + 2];
      const jitterX = (Math.random() - 0.5) * 0.55;
      const jitterY = (Math.random() - 0.5) * 0.55;
      const jitterZ = (Math.random() - 0.5) * 0.55;

      sources[index] = stream.source[0] + jitterX;
      sources[index + 1] = stream.source[1] + jitterY;
      sources[index + 2] = stream.source[2] + jitterZ;

      controlsA[index] = stream.controlA[0] + jitterX * 0.35;
      controlsA[index + 1] = stream.controlA[1] + jitterY * 0.35;
      controlsA[index + 2] = stream.controlA[2] + jitterZ * 0.35;

      controlsB[index] = stream.controlB[0] * 0.65 + targetX * 0.35 + (Math.random() - 0.5) * 0.22;
      controlsB[index + 1] = stream.controlB[1] * 0.65 + targetY * 0.35 + (Math.random() - 0.5) * 0.22;
      controlsB[index + 2] = stream.controlB[2] * 0.65 + targetZ * 0.35 + (Math.random() - 0.5) * 0.22;

      targets[index] = targetX;
      targets[index + 1] = targetY;
      targets[index + 2] = targetZ;

      positions[index] = sources[index];
      positions[index + 1] = sources[index + 1];
      positions[index + 2] = sources[index + 2];

      const logoRed = logoData.colors[logoIndex] ?? 0.65;
      const logoGreen = logoData.colors[logoIndex + 1] ?? 0.85;
      const logoBlue = logoData.colors[logoIndex + 2] ?? 1;

      baseColors[index] = THREE.MathUtils.clamp(logoRed * 0.6 + stream.tint[0] * 0.55, 0, 1);
      baseColors[index + 1] = THREE.MathUtils.clamp(logoGreen * 0.6 + stream.tint[1] * 0.55, 0, 1);
      baseColors[index + 2] = THREE.MathUtils.clamp(logoBlue * 0.6 + stream.tint[2] * 0.55, 0, 1);

      colors[index] = 0;
      colors[index + 1] = 0;
      colors[index + 2] = 0;
      sizes[particleIndex] = 0;

      offsets[particleIndex] = localIndex / particlesPerStream + Math.random() * 0.24;
      phases[particleIndex] = Math.random() * Math.PI * 2;
      radii[particleIndex] = 0.24 + Math.random() * 0.72;
      speeds[particleIndex] = 0.045 + Math.random() * 0.035;
      flickerRates[particleIndex] = 0.6 + Math.random() * 1.2;
      targetSizes[particleIndex] = 1.1 + Math.random() * 1.9;

      swirlScales[index] = 0.55 + Math.random() * 0.65;
      swirlScales[index + 1] = 0.55 + Math.random() * 0.65;
      swirlScales[index + 2] = 0.35 + Math.random() * 0.55;
    }
  }

  return {
    positions,
    colors,
    sizes,
    baseColors,
    sources,
    controlsA,
    controlsB,
    targets,
    offsets,
    phases,
    radii,
    speeds,
    flickerRates,
    targetSizes,
    swirlScales,
    count,
  };
}

function createSteamParticleMaterial(particleTexture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      opacity: { value: 0.58 },
      pointTexture: { value: particleTexture },
    },
    vertexShader: `
      attribute vec3 particleColor;
      attribute float particleSize;

      varying vec3 vColor;

      void main() {
        vColor = particleColor;

        vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewPosition;
        gl_PointSize = particleSize * (6.0 / max(0.1, -modelViewPosition.z));
      }
    `,
    fragmentShader: `
      uniform float opacity;
      uniform sampler2D pointTexture;

      varying vec3 vColor;

      void main() {
        vec4 sprite = texture2D(pointTexture, gl_PointCoord);
        vec2 centeredUv = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(centeredUv);
        float halo = smoothstep(0.5, 0.08, distanceFromCenter);
        float core = smoothstep(0.22, 0.02, distanceFromCenter);
        float alpha = (sprite.a * 0.42 + halo * 0.36 + core * 0.22) * opacity;

        if (alpha < 0.01) {
          discard;
        }

        vec3 glow = vColor * (1.35 + halo * 1.8 + core * 1.1);
        gl_FragColor = vec4(glow, alpha);
      }
    `,
  });
}

function cubicBezier(start: number, controlA: number, controlB: number, end: number, progress: number) {
  const inverse = 1 - progress;

  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * progress * controlA +
    3 * inverse * progress * progress * controlB +
    progress * progress * progress * end
  );
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const progress = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return progress * progress * (3 - 2 * progress);
}
