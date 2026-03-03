"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// STEP 1: A tiny R3F component that renders a single quad with a custom shader.
// The shader offsets UV sampling by depth (white=near) to create parallax.
function DepthParallaxPlane(props: {
  imageUrl: string;
  depthUrl: string;
  // Strength of parallax; keep small (0.01 ~ 0.08) to avoid visible "holes".
  strength?: number;
}) {
  const { imageUrl, depthUrl, strength = 0.01 } = props;

  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const { mouse } = useThree();

  const [textures, setTextures] = useState<{
    color?: THREE.Texture;
    depth?: THREE.Texture;
  }>({});

  // STEP 2: Load textures (color + depth). Depth is data → keep it linear.
  useEffect(() => {
    let mounted = true;
    const loader = new THREE.TextureLoader();

    const loadOne = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        loader.crossOrigin = "anonymous";
        loader.load(url, resolve, undefined, reject);
      });

    (async () => {
      const [colorTex, depthTex] = await Promise.all([loadOne(imageUrl), loadOne(depthUrl)]);

      // Color texture should be sRGB for correct display.
      // Depth texture should remain linear (default).
      // (Three r152+ uses `colorSpace`; older versions used `encoding`.)
      // @ts-ignore
      colorTex.colorSpace = THREE.SRGBColorSpace;

      colorTex.wrapS = colorTex.wrapT = THREE.ClampToEdgeWrapping;
      depthTex.wrapS = depthTex.wrapT = THREE.ClampToEdgeWrapping;

      colorTex.minFilter = THREE.LinearFilter;
      colorTex.magFilter = THREE.LinearFilter;
      depthTex.minFilter = THREE.LinearFilter;
      depthTex.magFilter = THREE.LinearFilter;

      colorTex.generateMipmaps = false;
      depthTex.generateMipmaps = false;

      if (!mounted) return;
      setTextures({ color: colorTex, depth: depthTex });
    })().catch((e) => {
      console.error("Failed to load textures", e);
    });

    return () => {
      mounted = false;
    };
  }, [imageUrl, depthUrl]);

  // STEP 3: Define shader uniforms + code.
  const uniforms = useMemo(() => {
    return {
      uImage: { value: null as THREE.Texture | null },
      uDepth: { value: null as THREE.Texture | null },
      uShift: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: strength },
    };
  }, [strength]);

  // Keep uniforms updated when textures arrive.
  useEffect(() => {
    if (!materialRef.current) return;
    if (textures.color) materialRef.current.uniforms.uImage.value = textures.color;
    if (textures.depth) materialRef.current.uniforms.uDepth.value = textures.depth;
  }, [textures]);

  // STEP 4: Drive parallax by mouse position (subtle). You can swap this for device tilt later.
  useFrame(() => {
    if (!materialRef.current) return;
    // mouse is in [-1, 1]. Small shift creates the illusion.
    materialRef.current.uniforms.uShift.value.set(mouse.x, mouse.y);
  });

  const vertexShader = useMemo(
    () => `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    []
  );

  const fragmentShader = useMemo(
    () => `
      uniform sampler2D uImage;
      uniform sampler2D uDepth;
      uniform vec2 uShift;
      uniform float uStrength;

      varying vec2 vUv;

      void main() {
        // Depth is assumed: white = near, black = far
        float d = texture2D(uDepth, vUv).r;

        // Center depth around 0.5 so mid-depth shifts less.
        // Near (white) shifts more; far shifts less.
        float centered = d - 0.5;

        // Parallax direction: invert Y because screen UV Y is bottom->top.
        vec2 dir = vec2(uShift.x, -uShift.y);

        // UV offset
        vec2 uv2 = vUv + dir * centered * uStrength;

        // Avoid sampling outside the image.
        uv2 = clamp(uv2, 0.0, 1.0);

        vec4 color = texture2D(uImage, uv2);
        gl_FragColor = color;
      }
    `,
    []
  );

  // STEP 5: Render a single quad that fills most of the view.
  // We use a 1x1 plane and scale it in the parent if needed.
  return (
    <mesh>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={false}
      />
    </mesh>
  );
}

export default function Sandbox() {
  // STEP 0: Put your assets in /public so they can be loaded by URL.
  // Example paths:
  //   /public/depth/photo.jpg
  //   /public/depth/photo_depth.png
  const imageUrl = "/3d/test/jesus.png";
  const depthUrl = "/3d/test/jesus-depth.png";

  return (
    <>
      <h1>This is the sand box</h1>

      <div className="w-full h-dvh">
        <Canvas camera={{ position: [0, 0, 1.2], fov: 45 }}>
          <DepthParallaxPlane imageUrl={imageUrl} depthUrl={depthUrl} strength={0.01} />
        </Canvas>
      </div>
    </>
  );
}
