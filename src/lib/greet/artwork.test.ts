import test from "node:test";
import assert from "node:assert/strict";
import {
  loadGreetingArtwork,
  readGreetingArtworkFile,
  type GreetingArtworkEffects,
} from "./artwork.ts";
import type { GreetingEntry } from "./policy.ts";

const pageId = "11111111-1111-4111-8111-111111111111";
const databaseId = "22222222-2222-4222-8222-222222222222";
const entry: GreetingEntry = {
  id: "creation-light",
  artworkPageId: pageId,
  artworkTitle: { en: "Genesis 1:1-31", "zh-TW": "創世記 1:1-31" },
  verse: { en: "Let there be light", "zh-TW": "要有光" },
  reference: { en: "Genesis 1:3", "zh-TW": "創世記 1:3" },
  provenance: { source: "notion-bible-artworks", book: "Genesis", chapter: 1, verse: 3, section: "1:1-31", verifiedOn: "2026-11-03" },
};
const now = Date.parse("2026-11-03T00:00:00Z");
const assetUrl = "https://prod-files-secure.s3.us-west-2.amazonaws.com/artwork.jpeg?token=private";
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 16]);

function page() {
  return {
    object: "page",
    id: pageId,
    archived: false,
    parent: { type: "database_id", database_id: databaseId },
    properties: {
      Book: { type: "select", select: { name: "Genesis" } },
      Section: { type: "rich_text", rich_text: [{ plain_text: "1:1-31" }] },
      en: { type: "rich_text", rich_text: [{ plain_text: "And God said, Let there be light: and there was light." }] },
      zh: { type: "rich_text", rich_text: [{ plain_text: "神說：要有光，就有了光。" }] },
      Artwork: {
        type: "files",
        files: [{ type: "file", file: { url: assetUrl, expiry_time: "2026-11-03T01:00:00Z" } }],
      },
    },
  };
}

function effects(overrides: Partial<GreetingArtworkEffects> = {}): GreetingArtworkEffects {
  return {
    readPage: async () => ({ kind: "found", page: page() }),
    fetchAsset: async () => new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } }),
    now: () => now,
    ...overrides,
  };
}

test("loads the approved artwork bytes without returning provider URLs", async () => {
  const result = await loadGreetingArtwork(entry, databaseId, effects());
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") assert.fail("Artwork should be ready");
  assert.deepEqual(result.artwork.bytes, jpeg);
  assert.equal(result.artwork.mediaType, "image/jpeg");
  assert.deepEqual(Object.keys(result.artwork).sort(), ["bytes", "mediaType"]);
});

test("rejects malformed provider fields, changed IDs and other database membership", () => {
  assert.throws(() => readGreetingArtworkFile({}, entry, databaseId), /Invalid Notion/);
  assert.throws(() => readGreetingArtworkFile(page(), { ...entry, artworkPageId: databaseId }, databaseId), /identifier changed/);
  assert.throws(() => readGreetingArtworkFile(page(), entry, pageId), /outside the configured gallery/);
  const invalid = page();
  invalid.properties.Artwork.files[0].file.expiry_time = "tomorrow";
  assert.throws(() => readGreetingArtworkFile(invalid, entry, databaseId), /Invalid Notion/);
});

test("rejects unapproved hosts, credentials, ports and insecure protocols before fetching", async () => {
  for (const url of [
    "http://prod-files-secure.s3.us-west-2.amazonaws.com/image.jpeg",
    "https://127.0.0.1/image.jpeg",
    "https://prod-files-secure.s3.us-west-2.amazonaws.com.evil.test/image.jpeg",
    "https://user:password@prod-files-secure.s3.us-west-2.amazonaws.com/image.jpeg",
    "https://prod-files-secure.s3.us-west-2.amazonaws.com:444/image.jpeg",
    "https://prod-files-secure.s3.us-west-2.amazonaws.com/image.jpeg#fragment",
  ]) {
    const invalid = page();
    invalid.properties.Artwork.files[0].file.url = url;
    await assert.rejects(() => loadGreetingArtwork(entry, databaseId, effects({
      readPage: async () => ({ kind: "found", page: invalid }),
      fetchAsset: async () => { assert.fail("Unapproved URL must not be fetched"); },
    })), /unsupported asset URL/);
  }
});

test("rejects changed source passages and excerpts before fetching artwork", async () => {
  const changedBook = page();
  changedBook.properties.Book.select.name = "Exodus";
  const changedSection = page();
  changedSection.properties.Section.rich_text[0].plain_text = "2:1-3";
  const changedEnglish = page();
  changedEnglish.properties.en.rich_text[0].plain_text = "A different passage";
  const changedChinese = page();
  changedChinese.properties.zh.rich_text[0].plain_text = "不同的經文";
  for (const changed of [changedBook, changedSection, changedEnglish, changedChinese]) {
    await assert.rejects(() => loadGreetingArtwork(entry, databaseId, effects({
      readPage: async () => ({ kind: "found", page: changed }),
      fetchAsset: async () => { assert.fail("Changed source must not be fetched"); },
    })), /scripture identity changed|no longer contains/);
  }
});

test("refreshes an expired URL before fetching and keeps the same selected page", async () => {
  const calls: string[] = [];
  const expired = page();
  expired.properties.Artwork.files[0].file.expiry_time = "2026-11-03T00:00:00Z";
  const result = await loadGreetingArtwork(entry, databaseId, effects({
    readPage: async (id) => {
      calls.push(id);
      return { kind: "found", page: calls.length === 1 ? expired : page() };
    },
  }));
  assert.equal(result.kind, "ready");
  assert.deepEqual(calls, [pageId, pageId]);
});

test("re-fetches the provider object once after an asset returns 403", async () => {
  let lookups = 0;
  let downloads = 0;
  const result = await loadGreetingArtwork(entry, databaseId, effects({
    readPage: async () => { lookups += 1; return { kind: "found", page: page() }; },
    fetchAsset: async () => {
      downloads += 1;
      return downloads === 1
        ? new Response(null, { status: 403 })
        : new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } });
    },
  }));
  assert.equal(result.kind, "ready");
  assert.equal(lookups, 2);
  assert.equal(downloads, 2);
});

test("returns explicit unavailable outcomes for removed and repeatedly expired artwork", async () => {
  const removed = await loadGreetingArtwork(entry, databaseId, effects({
    readPage: async () => ({ kind: "missing" }),
  }));
  assert.deepEqual(removed, { kind: "unavailable", reason: "removed" });
  const archived = page();
  archived.archived = true;
  assert.deepEqual(await loadGreetingArtwork(entry, databaseId, effects({
    readPage: async () => ({ kind: "found", page: archived }),
  })), removed);
  assert.deepEqual(await loadGreetingArtwork(entry, databaseId, effects({
    fetchAsset: async () => new Response(null, { status: 404 }),
  })), removed);
  assert.deepEqual(await loadGreetingArtwork(entry, databaseId, effects({
    fetchAsset: async () => new Response(null, { status: 403 }),
  })), { kind: "unavailable", reason: "expired" });
});

test("rejects redirects, unsupported media, corrupted signatures and oversized responses", async () => {
  const responses = [
    new Response(null, { status: 302, headers: { Location: "https://127.0.0.1" } }),
    new Response("<svg></svg>", { headers: { "Content-Type": "image/svg+xml" } }),
    new Response("not an image", { headers: { "Content-Type": "image/jpeg" } }),
    new Response(jpeg, { headers: { "Content-Type": "image/jpeg", "Content-Length": "20971521" } }),
  ];
  for (const response of responses) {
    await assert.rejects(() => loadGreetingArtwork(entry, databaseId, effects({
      fetchAsset: async () => response,
    })));
  }
  await assert.rejects(() => loadGreetingArtwork(entry, databaseId, effects({
    fetchAsset: async () => new Response(new Uint8Array(20 * 1024 * 1024 + 1), {
      headers: { "Content-Type": "image/jpeg" },
    }),
  })), /maximum image size/);
});

test("unexpected network failures propagate without being treated as missing artwork", async () => {
  await assert.rejects(() => loadGreetingArtwork(entry, databaseId, effects({
    readPage: async () => { throw new Error("Network unavailable"); },
  })), /Network unavailable/);
  await assert.rejects(() => loadGreetingArtwork(entry, databaseId, effects({
    fetchAsset: async () => new Response(null, { status: 503 }),
  })), /Artwork image request failed/);
});
