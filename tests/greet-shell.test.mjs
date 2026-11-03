import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSourceModule } from "./helpers/source-module.mjs";

function renderShell(pathname) {
  const mounted = [];
  const chrome = (tag) => () => {
    mounted.push(tag);
    return React.createElement(tag, null, `Website ${tag}`);
  };
  const { default: SiteShell } = loadSourceModule("src/components/site-shell.tsx", {
    "next/navigation": { usePathname: () => pathname },
    "./header": chrome("header"),
    "./navbar": chrome("nav"),
    "./footer": chrome("footer"),
    "./chinese-only-guard": ({ children }) => {
      mounted.push("guard");
      return children;
    },
  });
  return {
    html: renderToStaticMarkup(React.createElement(SiteShell, null, React.createElement("p", null, "Greeting content"))),
    mounted,
  };
}

test("daily blessing server markup contains only the accessible padding-free page shell", () => {
  const { html, mounted } = renderShell("/daily-blessing");
  assert.deepEqual(mounted, []);
  assert.match(html, /<main id="main-content" tabindex="-1"/);
  assert.match(html, /Greeting content/);
  assert.doesNotMatch(html, /<header|<nav|<footer|header-height|pb-8/);
});

test("ordinary and similarly named routes retain the full site shell and language guard", () => {
  for (const pathname of ["/", "/about", "/glory-share", "/greet", "/greeting", "/daily-blessing/details"]) {
    const { html, mounted } = renderShell(pathname);
    assert.deepEqual(mounted, ["header", "guard", "nav", "footer"]);
    assert.match(html, /<main id="main-content" tabindex="-1"/);
    assert.match(html, /pt-\(--header-height\)/);
    assert.match(html, /Greeting content/);
  }
});

test("daily blessing is visible immediately without the site fade or blur while keeping its provider", () => {
  const motionProps = [];
  let providerRendered = false;
  const { default: ClientRoot } = loadSourceModule("src/app/client-layout.tsx", {
    "next/navigation": { usePathname: () => "/daily-blessing" },
    "../lib/i18n": {},
    "framer-motion": {
      useReducedMotion: () => false,
      MotionConfig: ({ children }) => children,
      motion: { div: ({ children, ...props }) => {
        motionProps.push(props);
        return React.createElement("div", { className: props.className }, children);
      } },
    },
    "@/providers/shopping-cart-provider": ({ children }) => {
      providerRendered = true;
      return children;
    },
    "@tanstack/react-query": { useQuery() {} },
    "@/models/bible-artworks": {},
    "@/models/song": {},
    "@/hooks/use-translation": () => ({}),
    "@/utils/query-keys": { QueryKey: {} },
  });
  const html = renderToStaticMarkup(React.createElement(ClientRoot, null, "Greeting content"));
  assert.match(html, /Greeting content/);
  assert.equal(providerRendered, true);
  assert.equal(motionProps.length, 1);
  assert.deepEqual(motionProps[0].initial, { opacity: 1 });
  assert.deepEqual(motionProps[0].transition, { duration: 0 });
  assert.doesNotMatch(html, /pointer-events-none/);
});
