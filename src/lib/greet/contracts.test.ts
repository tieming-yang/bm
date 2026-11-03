import assert from "node:assert/strict";
import test from "node:test";
import {
  GreetingCardDescriptionSchema,
  GreetingDateSchema,
  createGreetingFilename,
  createGreetingImageUrl,
  formatGreetingDate,
  getGreetingLabel,
  getLocalGreetingContext,
  millisecondsUntilNextGreetingBoundary,
  parseGreetingImageRequest,
  parseGreetingRequest,
} from "./contracts.ts";

test("public requests reject impossible dates, unsupported values, and added rendering inputs", () => {
  const valid = { date: "2028-02-29", period: "morning", locale: "en" };
  assert.equal(parseGreetingRequest(valid).kind, "valid");
  assert.equal(parseGreetingImageRequest({ ...valid, version: "v1" }).kind, "valid");
  for (const input of [
    { ...valid, date: "2026-02-29" },
    { ...valid, date: "2026-04-31" },
    { ...valid, date: "2026-13-01" },
    { ...valid, date: "2026-00-01" },
    { ...valid, date: "0000-01-01" },
    { ...valid, date: "2026-1-03" },
    { ...valid, period: "dawn" },
    { ...valid, locale: "zh-CN" },
    { ...valid, imageUrl: "https://example.com/image.png" },
    { ...valid, verse: "Caller supplied text" },
    null,
  ]) assert.equal(parseGreetingRequest(input).kind, "invalid");
  for (const version of ["", "v0", "v01", "V1", "../v1", 1]) {
    assert.equal(parseGreetingImageRequest({ ...valid, version }).kind, "invalid");
  }
  assert.equal(parseGreetingImageRequest(valid).kind, "invalid");
  assert.equal(GreetingDateSchema.safeParse("2000-02-29").success, true);
  assert.equal(GreetingDateSchema.safeParse("2100-02-29").success, false);
});

test("local periods change exactly at 05:00, 12:00, 18:00, 21:00 and dates at midnight", () => {
  const cases = [
    [0, 0, "night"], [4, 59, "night"], [5, 0, "morning"], [11, 59, "morning"],
    [12, 0, "afternoon"], [17, 59, "afternoon"], [18, 0, "evening"],
    [20, 59, "evening"], [21, 0, "night"], [23, 59, "night"],
  ] as const;
  for (const [hour, minute, period] of cases) {
    assert.deepEqual(getLocalGreetingContext(new Date(2026, 10, 3, hour, minute), "en"), {
      date: "2026-11-03", period, locale: "en",
    });
  }
  assert.equal(getLocalGreetingContext(new Date(2026, 10, 4, 0), "zh-TW").date, "2026-11-04");
  assert.equal(millisecondsUntilNextGreetingBoundary(new Date(2026, 10, 3, 23, 59, 59, 250)), 750);
  assert.equal(millisecondsUntilNextGreetingBoundary(new Date(2026, 10, 3, 5)), 7 * 60 * 60 * 1000);
  assert.throws(() => getLocalGreetingContext(new Date(NaN), "en"), /valid Date/);
  assert.throws(() => millisecondsUntilNextGreetingBoundary(new Date(NaN)), /valid Date/);
});

test("viewer-local dates and DST boundary timers do not use a fixed UTC-day duration", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Asia/Tokyo";
    assert.equal(getLocalGreetingContext(new Date("2026-11-03T00:00:00Z"), "en").date, "2026-11-03");
    process.env.TZ = "America/Los_Angeles";
    assert.equal(getLocalGreetingContext(new Date("2026-11-03T00:00:00Z"), "en").date, "2026-11-02");
    process.env.TZ = "America/New_York";
    assert.equal(millisecondsUntilNextGreetingBoundary(new Date(2026, 2, 8, 0)), 4 * 60 * 60 * 1000);
    assert.equal(millisecondsUntilNextGreetingBoundary(new Date(2026, 10, 1, 0)), 6 * 60 * 60 * 1000);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("client descriptions reject cross-field mismatches, external image URLs, and private fields", () => {
  const request = { date: "2026-11-03", period: "morning", locale: "en", version: "v1" } as const;
  const description = {
    ...request,
    entryId: "genesis-1-3",
    greeting: getGreetingLabel(request.locale, request.period),
    dateLabel: formatGreetingDate(request.date, request.locale),
    verse: "And God said, Let there be light: and there was light.",
    reference: "Genesis 1:3",
    artworkTitle: "Genesis 1:1-31",
    imageUrl: createGreetingImageUrl(request),
    filename: createGreetingFilename(request),
  };
  assert.equal(GreetingCardDescriptionSchema.safeParse(description).success, true);
  for (const input of [
    { ...description, greeting: "Good night" },
    { ...description, dateLabel: "November 4, 2026" },
    { ...description, imageUrl: "https://example.com/image.png" },
    { ...description, imageUrl: description.imageUrl.replace("morning", "night") },
    { ...description, imageUrl: `${description.imageUrl}&artworkPageId=private` },
    { ...description, filename: "../card.png" },
    { ...description, artworkPageId: "private-provider-id" },
    { ...description, provenance: {} },
  ]) assert.equal(GreetingCardDescriptionSchema.safeParse(input).success, false);
  assert.equal(formatGreetingDate("2026-11-03", "zh-TW"), "2026年11月3日");
});
