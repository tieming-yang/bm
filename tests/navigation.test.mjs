import test from "node:test";
import assert from "node:assert/strict";
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
