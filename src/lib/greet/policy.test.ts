import assert from "node:assert/strict";
import test from "node:test";
import {
  createGreetingCardDescription,
  resolveGreetingSelection,
  validateGreetingRotations,
  type GreetingRotation,
} from "./policy.ts";

const entry = {
  id: "genesis-1-3",
  artworkPageId: "00000000-0000-4000-8000-000000000001",
  artworkTitle: { en: "Genesis 1:1-31", "zh-TW": "創世記 1:1-31" },
  verse: { en: "And God said, Let there be light: and there was light.", "zh-TW": "神說：要有光，就有了光。" },
  reference: { en: "Genesis 1:3", "zh-TW": "創世記 1:3" },
  provenance: { source: "notion-bible-artworks", book: "Genesis", chapter: 1, verse: 3, section: "1:1-31", verifiedOn: "2026-11-03" },
} as const;

const rotations = validateGreetingRotations([{
  version: "v1", effectiveFrom: "2026-11-03", entries: [entry, { ...entry, id: "second-entry" }],
}]);
const request = { date: "2026-11-03", period: "morning", locale: "en" } as const;

test("daily selection retains artwork and verse across every locale and period, then advances at midnight", () => {
  for (const locale of ["en", "zh-TW"] as const) {
    for (const period of ["morning", "afternoon", "evening", "night"] as const) {
      const selection = resolveGreetingSelection({ ...request, locale, period }, rotations);
      assert.equal(selection.kind, "selected");
      if (selection.kind !== "selected") assert.fail("Expected a selected greeting");
      assert.equal(selection.entry.id, entry.id);
    }
  }
  const tomorrow = resolveGreetingSelection({ ...request, date: "2026-11-04" }, rotations);
  assert.equal(tomorrow.kind, "selected");
  if (tomorrow.kind !== "selected") assert.fail("Expected tomorrow's greeting");
  assert.equal(tomorrow.entry.id, "second-entry");
  const repeat = resolveGreetingSelection({ ...request, date: "2026-11-05" }, rotations);
  assert.equal(repeat.kind, "selected");
  if (repeat.kind !== "selected") assert.fail("Expected a repeated rotation");
  assert.equal(repeat.entry.id, entry.id);
});

test("future versions preserve earlier dates and reject incompatible pinned requests explicitly", () => {
  const revised = validateGreetingRotations([...rotations, {
    version: "v2", effectiveFrom: "2026-12-01", entries: [{ ...entry, id: "next-version-entry" }],
  }]);
  assert.deepEqual(resolveGreetingSelection(request, revised, "v1"), resolveGreetingSelection(request, rotations));
  const next = resolveGreetingSelection({ ...request, date: "2026-12-01" }, revised, "v2");
  assert.equal(next.kind, "selected");
  if (next.kind !== "selected") assert.fail("Expected newly active version");
  assert.equal(next.entry.id, "next-version-entry");
  assert.deepEqual(resolveGreetingSelection({ ...request, date: "2026-11-02" }, revised), { kind: "unavailable", reason: "date-before-launch" });
  assert.deepEqual(resolveGreetingSelection(request, revised, "v99"), { kind: "unavailable", reason: "unknown-version" });
  assert.deepEqual(resolveGreetingSelection(request, revised, "v2"), { kind: "unavailable", reason: "version-not-active" });
  assert.deepEqual(resolveGreetingSelection({ ...request, date: "2026-12-01" }, revised, "v1"), { kind: "unavailable", reason: "version-not-active" });
});

test("editorial validation rejects malformed references, source ranges, translations and version histories", () => {
  const base = { version: "v1", effectiveFrom: "2026-11-03", entries: [entry] };
  const invalidEntries = [
    { ...entry, artworkPageId: "not-a-page-id" },
    { ...entry, verse: { en: "", "zh-TW": "光" } },
    { ...entry, reference: { ...entry.reference, en: "Genesis 1:4" } },
    { ...entry, artworkTitle: { ...entry.artworkTitle, "zh-TW": "錯誤書卷" } },
    { ...entry, provenance: { ...entry.provenance, section: "1:4-31" } },
    { ...entry, provenance: { ...entry.provenance, section: "1:31-1" } },
    { ...entry, provenance: { ...entry.provenance, chapter: 2 } },
    { ...entry, provenance: { ...entry.provenance, verifiedOn: "2026-11-04" } },
  ];
  for (const invalid of invalidEntries) assert.throws(() => validateGreetingRotations([{ ...base, entries: [invalid] }]));
  assert.throws(() => validateGreetingRotations([]));
  assert.throws(() => validateGreetingRotations([{ ...base, entries: [] }]));
  assert.throws(() => validateGreetingRotations([{ ...base, entries: [entry, entry] }]), /entry IDs/);
  assert.throws(() => validateGreetingRotations([base, { ...base, effectiveFrom: "2026-12-01" }]), /versions/);
  assert.throws(() => validateGreetingRotations([base, { ...base, version: "v2" }]), /effective dates/);
  assert.throws(() => validateGreetingRotations([{ ...base, version: "v2" }, { ...base, version: "v1", effectiveFrom: "2026-12-01" }]), /versions/);
  assert.equal(Object.isFrozen(rotations), true);
  assert.equal(Object.isFrozen(rotations[0].entries[0].verse), true);
});

test("public descriptions expose only derived card fields and reject stale internal selections", () => {
  const selection = resolveGreetingSelection(request, rotations);
  if (selection.kind !== "selected") assert.fail("Expected a selected greeting");
  const description = createGreetingCardDescription(request, selection);
  assert.equal(description.entryId, entry.id);
  assert.equal(description.verse, entry.verse.en);
  assert.equal(JSON.stringify(description).includes(entry.artworkPageId), false);
  assert.equal("provenance" in description, false);
  assert.equal("artworkPageId" in description, false);
  const chinese = createGreetingCardDescription({ ...request, locale: "zh-TW", period: "night" }, selection);
  assert.equal(chinese.greeting, "晚安");
  assert.equal(chinese.verse, entry.verse["zh-TW"]);
  assert.equal(chinese.entryId, description.entryId);
  assert.throws(() => createGreetingCardDescription({ ...request, date: "2026-11-04" }, selection), /selection date/);
  assert.throws(() => resolveGreetingSelection(request, [] as readonly GreetingRotation[]));
});
