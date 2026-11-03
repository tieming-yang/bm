import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { greetingRotations } from "./content.ts";
import { createGreetingCardDescription, resolveGreetingSelection } from "./policy.ts";

test("published v1 text, source mappings, effective date and ordering remain immutable", () => {
  assert.equal(
    createHash("sha256").update(JSON.stringify(greetingRotations[0])).digest("hex"),
    "901e7ece9c5d9e6a4ea8044b1e877fa3ea18dd7d9d4d7ac4b03264ed4baba9bf",
    "Keep v1 unchanged and append a future-effective rotation for editorial changes",
  );
});

test("the previous launch-local day gets the last v1 entry without changing published dates", () => {
  const request = { date: "2026-11-02", period: "night", locale: "en" } as const;
  const previousDay = resolveGreetingSelection(request, greetingRotations, "v1");
  if (previousDay.kind !== "selected") assert.fail("November 2 viewers must receive a launch greeting");
  assert.equal(previousDay.entry.id, greetingRotations[0].entries.at(-1)?.id);
  assert.equal(previousDay.entry.id, "genesis-12-2");
  const launchDay = resolveGreetingSelection({ ...request, date: "2026-11-03" }, greetingRotations, "v1");
  if (launchDay.kind !== "selected") assert.fail("Published November 3 must stay selectable");
  assert.equal(launchDay.entry.id, "genesis-1-3");
  assert.deepEqual(resolveGreetingSelection({ ...request, date: "2026-11-01" }, greetingRotations), {
    kind: "unavailable", reason: "date-before-launch",
  });
});

test("every curated translation is an exact excerpt of its captured live Notion source context", () => {
  const source = JSON.parse(readFileSync(new URL("./content-source.v1.json", import.meta.url), "utf8"));
  assert.equal(source.verifiedOn, "2026-11-03");
  assert.equal(source.catalogRecordCount, 88);
  assert.equal(source.artworkRecordCount, 87);
  assert.equal(source.entries.length, greetingRotations[0].entries.length);
  for (const entry of greetingRotations[0].entries) {
    const snapshot = source.entries.find((candidate: { entryId: string }) => candidate.entryId === entry.id);
    assert.ok(snapshot, `Missing provenance snapshot for ${entry.id}`);
    assert.equal(snapshot.artworkPageId, entry.artworkPageId);
    assert.equal(snapshot.title, entry.artworkTitle.en);
    assert.equal(snapshot.book, entry.provenance.book);
    assert.equal(snapshot.section, entry.provenance.section);
    for (const locale of ["en", "zh-TW"] as const) {
      assert.ok(snapshot[locale].context.includes(entry.verse[locale]), `Excerpt changed from its source for ${entry.id} (${locale})`);
      assert.match(snapshot[locale].sourceSha256, /^[a-f0-9]{64}$/);
    }
  }
});

test("all published entries produce safe descriptions in every supported presentation", () => {
  const v1 = greetingRotations[0];
  for (let index = 0; index < v1.entries.length; index += 1) {
    const date = new Date(`${v1.effectiveFrom}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    for (const locale of ["en", "zh-TW"] as const) {
      for (const period of ["morning", "afternoon", "evening", "night"] as const) {
        const request = { date: date.toISOString().slice(0, 10), period, locale };
        const selection = resolveGreetingSelection(request, greetingRotations, "v1");
        if (selection.kind !== "selected") assert.fail("Published content must be selectable");
        const description = createGreetingCardDescription(request, selection);
        assert.equal(description.entryId, v1.entries[index].id);
        assert.equal(description.verse, v1.entries[index].verse[locale]);
        assert.equal(JSON.stringify(description).includes(v1.entries[index].artworkPageId), false);
      }
    }
  }
});
