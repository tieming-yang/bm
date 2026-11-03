import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSourceModule } from "./helpers/source-module.mjs";

for (const reducedMotion of [true, false]) {
  test(`route transition respects reduced-motion=${reducedMotion}`, () => {
    const { default: ClientRoot } = loadSourceModule("src/app/client-layout.tsx", {
      "next/navigation": { usePathname: () => "/about" },
      "../lib/i18n": {},
      "framer-motion": {
        useReducedMotion: () => reducedMotion,
        MotionConfig: ({ children }) => children,
        motion: { div: ({ children, className }) => React.createElement("div", { className }, children) },
      },
      "@/providers/shopping-cart-provider": ({ children }) => children,
      "@tanstack/react-query": { useQuery() {} },
      "@/models/bible-artworks": {},
      "@/models/song": {},
      "@/hooks/use-translation": () => ({}),
      "@/utils/query-keys": { QueryKey: {} },
    });
    const html = renderToStaticMarkup(React.createElement(ClientRoot, null, React.createElement("p", null, "Page content")));
    assert.ok(html.includes("Page content"));
    assert.equal(html.includes("pointer-events-none"), !reducedMotion);
  });
}

test("reduced motion renders static logo artwork without a WebGL animation", () => {
  const { default: Logo3D } = loadSourceModule("src/components/logo-3d.tsx", {
    "@react-three/fiber": { Canvas: () => { throw new Error("Animated canvas must not mount"); } },
    "framer-motion": { useReducedMotion: () => true },
  });
  const html = renderToStaticMarkup(React.createElement(Logo3D));
  assert.ok(html.includes("/logos/logo-metalic.webp"));
  assert.equal(html.includes("<canvas"), false);
});
