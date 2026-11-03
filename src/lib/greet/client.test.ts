import assert from "node:assert/strict";
import test from "node:test";
import {
  GREET_SHARE_URL,
  loadGreetingCard,
  shareGreetingImage,
  shareGreetingLink,
} from "./client.ts";
import type { GreetingCardDescription, GreetingRequest } from "./contracts.ts";

const request: GreetingRequest = { date: "2026-11-03", period: "morning", locale: "en" };
const description: GreetingCardDescription = {
  ...request,
  version: "v1",
  entryId: "genesis-1-3",
  greeting: "Good morning",
  dateLabel: "November 3, 2026",
  verse: "And God said, Let there be light: and there was light.",
  reference: "Genesis 1:3",
  artworkTitle: "Genesis 1:1-31",
  imageUrl: "/api/daily-blessing/image?date=2026-11-03&period=morning&locale=en&version=v1",
  filename: "beyond-greeting-2026-11-03-morning-en-v1.png",
};
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const pngResponse = () => new Response(png, { headers: { "Content-Type": "image/png" } });
const signal = () => new AbortController().signal;

test("loads the descriptor and preserves exact image bytes for display and export", async () => {
  const calls: string[] = [];
  const result = await loadGreetingCard(request, async (url) => {
    calls.push(url);
    return calls.length === 1 ? Response.json(description) : pngResponse();
  }, signal());
  assert.deepEqual(calls, [
    "/api/daily-blessing/card?date=2026-11-03&period=morning&locale=en",
    description.imageUrl,
  ]);
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), png);
  assert.equal(result.description.reference, description.reference);
});

test("rejects malformed descriptions, changed context, and provider field leaks before image fetch", async () => {
  for (const invalid of [
    { ...description, reference: undefined },
    { ...description, period: "night" },
    { ...description, notionPageId: "private-provider-id" },
  ]) {
    let calls = 0;
    await assert.rejects(loadGreetingCard(request, async () => {
      calls++;
      return Response.json(invalid);
    }, signal()));
    assert.equal(calls, 1);
  }
});

test("rejects external image URLs and image context mismatches", async () => {
  for (const imageUrl of [
    "https://untrusted.example/image.png",
    "/api/daily-blessing/image?date=2026-11-04&period=morning&locale=en&version=v1",
    "/api/daily-blessing/image?date=2026-11-03&period=night&locale=en&version=v1",
    `${description.imageUrl}&date=2026-11-04`,
    `${description.imageUrl}&artworkUrl=https://untrusted.example/image.png`,
  ]) {
    let calls = 0;
    await assert.rejects(loadGreetingCard(request, async () => {
      calls++;
      return Response.json({ ...description, imageUrl });
    }, signal()));
    assert.equal(calls, 1);
  }
});

test("rejects a failed description or image response and malformed PNG data", async () => {
  await assert.rejects(loadGreetingCard(request, async () => new Response(null, { status: 503 }), signal()));
  for (const image of [
    new Response(null, { status: 502 }),
    new Response("not a PNG", { headers: { "Content-Type": "image/png" } }),
    new Response(png, { headers: { "Content-Type": "text/plain" } }),
  ]) {
    let calls = 0;
    await assert.rejects(loadGreetingCard(request, async () => ++calls === 1 ? Response.json(description) : image, signal()));
  }
});

test("aborted requests never complete successfully even if a fetch adapter ignores its signal", async () => {
  const controller = new AbortController();
  let completeImage: (response: Response) => void = () => {};
  const imagePending = new Promise<Response>((resolve) => { completeImage = resolve; });
  let imageStarted: () => void = () => {};
  const started = new Promise<void>((resolve) => { imageStarted = resolve; });
  let calls = 0;
  const pending = loadGreetingCard(request, async () => {
    if (++calls === 1) return Response.json(description);
    imageStarted();
    return imagePending;
  }, controller.signal);
  await started;
  controller.abort();
  completeImage(pngResponse());
  await assert.rejects(pending, { name: "AbortError" });
});

test("already aborted requests do not fetch", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadGreetingCard(request, async () => {
    assert.fail("An aborted request must not fetch");
  }, controller.signal), { name: "AbortError" });
});

test("link sharing starts immediately with the canonical invitation URL", async () => {
  let shared: ShareData | undefined;
  const pending = shareGreetingLink("Today’s blessing", {
    share: async (data) => { shared = data; },
  });
  assert.equal(GREET_SHARE_URL, "https://beyond-media.art/daily-blessing");
  assert.deepEqual(shared, { title: "Today’s blessing", url: "https://beyond-media.art/daily-blessing" });
  assert.equal(await pending, "shared");
});

test("link sharing copies on missing or failed native sharing, but never after cancellation", async () => {
  const copied: string[] = [];
  const copy = async (text: string) => { copied.push(text); };
  assert.equal(await shareGreetingLink("Blessing", { copy }), "copied");
  assert.equal(await shareGreetingLink("Blessing", {
    share: async () => { throw new Error("Native share unavailable"); }, copy,
  }), "copied");
  assert.deepEqual(copied, [GREET_SHARE_URL, GREET_SHARE_URL]);
  assert.equal(await shareGreetingLink("Blessing", {
    share: async () => { throw new DOMException("Cancelled", "AbortError"); }, copy,
  }), "cancelled");
  assert.equal(copied.length, 2);
  assert.equal(await shareGreetingLink("Blessing", {}), "failed");
  assert.equal(await shareGreetingLink("Blessing", {
    copy: async () => { throw new Error("Clipboard denied"); },
  }), "failed");
});

test("file sharing synchronously passes the exact prepared file", async () => {
  const file = new File([png], description.filename, { type: "image/png" });
  let shared: ShareData | undefined;
  const pending = shareGreetingImage(file, {
    canShare: (data) => data.files?.[0] === file,
    share: async (data) => { shared = data; },
  });
  assert.equal(shared?.files?.[0], file);
  assert.equal(await pending, "shared");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), png);
});

test("unsupported file sharing offers download; cancellation and failures remain distinct", async () => {
  const file = new File([png], description.filename, { type: "image/png" });
  assert.equal(await shareGreetingImage(file, {}), "download-needed");
  assert.equal(await shareGreetingImage(file, {
    canShare: () => false,
    share: async () => { assert.fail("Unsupported file sharing must not open a share sheet"); },
  }), "download-needed");
  assert.equal(await shareGreetingImage(file, {
    canShare: () => true,
    share: async () => { throw new DOMException("Cancelled", "AbortError"); },
  }), "cancelled");
  assert.equal(await shareGreetingImage(file, {
    canShare: () => true,
    share: async () => { throw new Error("Share failed"); },
  }), "failed");
});
