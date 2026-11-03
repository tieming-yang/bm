import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSourceModule } from "./helpers/source-module.mjs";

const { isRouteActive, breadcrumbEntries } = loadSourceModule("src/lib/ui/navigation.ts");

test("active navigation matches full route segments and excludes external links", () => {
  assert.equal(isRouteActive("/school/summer/2026/registration", "/school"), true);
  assert.equal(isRouteActive("/schoolhouse", "/school"), false);
  assert.equal(isRouteActive("/about", "/"), false);
  assert.equal(isRouteActive("/", "/"), true);
  assert.equal(isRouteActive("/", "https://shop.beyond-media.art/"), false);
});

test("registration breadcrumbs preserve full paths while omitting nonexistent intermediate pages", () => {
  assert.deepEqual(breadcrumbEntries("/school/summer/2026/registration"), [
    { href: "/school", segment: "school", current: false, linkable: true },
    { href: "/school/summer/2026/registration", segment: "registration", current: true, linkable: true },
  ]);
});

test("profile IDs never become labels or links to the nonexistent profile index", () => {
  assert.deepEqual(breadcrumbEntries("/profile/short-user-id"), [
    { href: "/profile", segment: "profile", current: true, linkable: false },
  ]);
});

test("long content titles remain in their canonical breadcrumb paths", () => {
  const title = "a-long-song-title-that-is-not-an-identifier";
  const entries = breadcrumbEntries(`/beyond-music/${title}`);
  assert.equal(entries.at(-1).segment, title);
  assert.equal(entries.at(-1).href, `/beyond-music/${title}`);
  assert.equal(entries.at(-1).current, true);
});

for (const [encoded, title] of [["You%20Fight%20for%20Me", "You Fight for Me"], [encodeURIComponent("祢是否也等我"), "祢是否也等我"], ["%E0", "%E0"]]) {
  test(`content breadcrumb displays readable text for ${encoded}`, () => {
    const { Breadcrumb } = loadSourceModule("src/components/breadcrumb.tsx", {
      "next/link": { __esModule: true, default: ({ href, children }) => React.createElement("a", { href }, children) },
      "next/navigation": { usePathname: () => `/beyond-music/${encoded}` },
      "../hooks/use-translation": { __esModule: true, default: () => ({ t: (key) => key }) },
      "@/data/books": { __esModule: true, default: { order: [] } },
      "@/lib/ui/navigation": { breadcrumbEntries },
    });
    const markup = renderToStaticMarkup(React.createElement(Breadcrumb));
    assert.ok(markup.includes(`aria-current="page"`));
    assert.ok(markup.includes(`>${title}</span>`));
    assert.equal(breadcrumbEntries(`/beyond-music/${encoded}`).at(-1).href, `/beyond-music/${encoded}`);
  });
}
