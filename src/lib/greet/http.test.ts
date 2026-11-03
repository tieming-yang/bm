import test from "node:test";
import assert from "node:assert/strict";
import { handleGreetingCardRequest, handleGreetingImageRequest, type GreetingImageEffects } from "./http.ts";
import type { GreetingRotation } from "./policy.ts";

const rotations: readonly GreetingRotation[] = [{
  version: "v1",
  effectiveFrom: "2026-11-03",
  entries: [{
    id: "creation-light",
    artworkPageId: "11111111-1111-4111-8111-111111111111",
    artworkTitle: { en: "Genesis 1:1-31", "zh-TW": "創世記 1:1-31" },
    verse: { en: "And God said, Let there be light: and there was light.", "zh-TW": "神說：要有光，就有了光。" },
    reference: { en: "Genesis 1:3", "zh-TW": "創世記 1:3" },
    provenance: { source: "notion-bible-artworks", book: "Genesis", chapter: 1, verse: 3, section: "1:1-31", verifiedOn: "2026-11-03" },
  }],
}];
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const query = "date=2026-11-03&period=morning&locale=en";

function request(params: string, path = "image") {
  return new Request(`https://beyond-media.art/api/greet/${path}?${params}`);
}

function effects(overrides: Partial<GreetingImageEffects> = {}): GreetingImageEffects {
  return {
    loadArtwork: async () => ({ kind: "ready", artwork: { bytes: png, mediaType: "image/png" } }),
    render: async () => png,
    checkpoint: () => {},
    ...overrides,
  };
}

test("card endpoint returns only safe public fields and a pinned image URL", async () => {
  const response = handleGreetingCardRequest(request(query, "card"), rotations);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.entryId, "creation-light");
  assert.equal(body.reference, "Genesis 1:3");
  assert.equal(body.imageUrl, `/api/greet/image?${query}&version=v1`);
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("11111111"), false);
  assert.equal(serialized.includes("provenance"), false);
  assert.equal(serialized.includes("notion"), false);
});

test("both endpoints reject duplicate, unknown, malformed and arbitrary URL/text inputs", async () => {
  for (const params of [
    `${query}&date=2026-11-04`,
    `${query}&url=https://127.0.0.1/private`,
    `${query}&verse=arbitrary`,
    `${query}&__proto__=value`,
    "date=2026-02-30&period=morning&locale=en",
    "date=2026-11-03&period=dawn&locale=en",
    "date=2026-11-03&period=morning&locale=ja",
    "date=2026-11-03&period=morning",
  ]) {
    assert.equal(handleGreetingCardRequest(request(params, "card"), rotations).status, 400);
    const result = await handleGreetingImageRequest(request(`${params}&version=v1`), rotations, effects({
      loadArtwork: async () => { assert.fail("Invalid input must not trigger provider I/O"); },
    }));
    assert.equal(result.status, 400);
  }
});

test("unavailable dates and unknown or inactive versions do not trigger provider work", async () => {
  const noProvider = effects({ loadArtwork: async () => { assert.fail("Unavailable selection must not fetch artwork"); } });
  assert.equal(handleGreetingCardRequest(request("date=2026-11-02&period=morning&locale=en"), rotations).status, 404);
  assert.equal((await handleGreetingImageRequest(request(`${query}&version=v99`), rotations, noProvider)).status, 404);
  assert.equal((await handleGreetingImageRequest(request("date=2026-11-02&period=morning&locale=en&version=v1"), rotations, noProvider)).status, 404);
  const revised = [...rotations, { ...rotations[0], version: "v2", effectiveFrom: "2026-11-10" }];
  assert.equal((await handleGreetingImageRequest(request("date=2026-11-10&period=morning&locale=en&version=v1"), revised, noProvider)).status, 409);
});

test("image workflow resolves the selected artwork before rendering and returns its exact PNG bytes", async () => {
  const order: string[] = [];
  const response = await handleGreetingImageRequest(request(`${query}&version=v1`), rotations, effects({
    loadArtwork: async (entry) => {
      order.push("load");
      assert.equal(entry.artworkPageId, rotations[0].entries[0].artworkPageId);
      return { kind: "ready", artwork: { bytes: png, mediaType: "image/png" } };
    },
    render: async (card, artwork) => {
      order.push("render");
      assert.equal(card.verse, rotations[0].entries[0].verse.en);
      assert.equal(artwork.bytes, png);
      return png;
    },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(order, ["load", "render"]);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(response.headers.get("Cache-Control") ?? "", /s-maxage=86400/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), png);
});

test("removed and expired artworks return retryable unavailability without substituting another card", async () => {
  for (const reason of ["removed", "expired"] as const) {
    const response = await handleGreetingImageRequest(request(`${query}&version=v1`), rotations, effects({
      loadArtwork: async () => ({ kind: "unavailable", reason }),
      render: async () => { assert.fail("Unavailable artwork must not render"); },
    }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("failures are reported at the effect boundary without returning or logging provider secrets", async () => {
  const events: unknown[] = [];
  const secret = "https://provider.test/image?token=private";
  const response = await handleGreetingImageRequest(request(`${query}&version=v1`), rotations, effects({
    loadArtwork: async () => { throw new Error(secret); },
    checkpoint: (event, context) => events.push({ event, context }),
  }));
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes(secret), false);
  assert.equal(JSON.stringify(events).includes(secret), false);
  assert.match(JSON.stringify(events), /greet.image.failed/);
  assert.match(JSON.stringify(events), /artwork/);
});

test("rejects invalid renderer bytes and isolates telemetry failures from business outcomes", async () => {
  const invalid = await handleGreetingImageRequest(request(`${query}&version=v1`), rotations, effects({
    render: async () => new Uint8Array([1, 2, 3]),
  }));
  assert.equal(invalid.status, 500);
  const noTelemetry = await handleGreetingImageRequest(request(`${query}&version=v1`), rotations, effects({
    checkpoint: () => { throw new Error("Telemetry unavailable"); },
  }));
  assert.equal(noTelemetry.status, 200);
  const unavailable = await handleGreetingImageRequest(request(`${query}&version=v1`), rotations, effects({
    loadArtwork: async () => ({ kind: "unavailable", reason: "removed" }),
    checkpoint: () => { throw new Error("Telemetry unavailable"); },
  }));
  assert.equal(unavailable.status, 503);
});
