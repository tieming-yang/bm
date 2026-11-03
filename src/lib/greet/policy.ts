import { z } from "zod";
import {
  GreetingCardDescriptionSchema,
  GreetingDateSchema,
  GreetingRequestSchema,
  createGreetingFilename,
  createGreetingImageUrl,
  formatGreetingDate,
  getGreetingLabel,
  type GreetingCardDescription,
  type GreetingRequest,
} from "./contracts.ts";

const localizedText = z.object({ en: z.string().min(1), "zh-TW": z.string().min(1) }).strict().readonly();
const bookNames = { Genesis: "創世記", Exodus: "出埃及記" } as const;

/** Private editorial content and the source needed to verify its exact scripture excerpt. */
export const GreetingEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  artworkPageId: z.string().uuid(),
  artworkTitle: localizedText,
  verse: z.object({
    en: z.string().min(1).max(250),
    "zh-TW": z.string().min(1).max(90),
  }).strict().readonly(),
  reference: localizedText,
  provenance: z.object({
    source: z.literal("notion-bible-artworks"),
    book: z.enum(["Genesis", "Exodus"]),
    chapter: z.number().int().positive(),
    verse: z.number().int().positive(),
    section: z.string().regex(/^\d+:\d+(?:-\d+)?$/),
    verifiedOn: GreetingDateSchema,
  }).strict().readonly(),
}).strict().superRefine((entry, context) => {
  const source = entry.provenance;
  const section = /^(\d+):(\d+)(?:-(\d+))?$/.exec(source.section);
  if (section) {
    const chapter = Number(section[1]);
    const start = Number(section[2]);
    const end = Number(section[3] ?? section[2]);
    if (chapter !== source.chapter || start < 1 || end < start || source.verse < start || source.verse > end) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["provenance"], message: "Greeting verse must belong to the artwork scripture section" });
    }
  }
  for (const locale of ["en", "zh-TW"] as const) {
    const book = locale === "en" ? source.book : bookNames[source.book];
    if (entry.reference[locale] !== `${book} ${source.chapter}:${source.verse}`) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["reference", locale], message: "Greeting reference must match its verified source verse" });
    }
    if (entry.artworkTitle[locale] !== `${book} ${source.section}`) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["artworkTitle", locale], message: "Greeting artwork title must match its source section" });
    }
  }
}).readonly();
export type GreetingEntry = z.infer<typeof GreetingEntrySchema>;

/** Frozen content order activated on a local calendar date. */
export const GreetingRotationSchema = z.object({
  version: z.string().regex(/^v[1-9]\d*$/),
  effectiveFrom: GreetingDateSchema,
  entries: z.array(GreetingEntrySchema).min(1).readonly(),
}).strict().readonly();
export type GreetingRotation = z.infer<typeof GreetingRotationSchema>;

/** Reject broken editorial state instead of silently selecting different content. */
export function validateGreetingRotations(input: unknown): readonly GreetingRotation[] {
  const rotations = z.array(GreetingRotationSchema).min(1).readonly().parse(input);
  const versions = new Set<string>();
  let previousDate: string | undefined;
  let previousVersion = 0;
  for (const rotation of rotations) {
    const versionNumber = Number(rotation.version.slice(1));
    if (versions.has(rotation.version) || versionNumber <= previousVersion) {
      throw new Error("Greeting rotation versions must be unique and increasing");
    }
    if (previousDate && rotation.effectiveFrom <= previousDate) {
      throw new Error("Greeting rotation effective dates must strictly increase");
    }
    const entryIds = new Set<string>();
    for (const entry of rotation.entries) {
      if (entryIds.has(entry.id)) throw new Error("Greeting rotation entry IDs must be unique");
      if (entry.provenance.verifiedOn > rotation.effectiveFrom) {
        throw new Error("Greeting content must be verified before its rotation takes effect");
      }
      entryIds.add(entry.id);
    }
    versions.add(rotation.version);
    previousDate = rotation.effectiveFrom;
    previousVersion = versionNumber;
  }
  return rotations;
}

export type SelectedGreeting = {
  readonly kind: "selected";
  readonly date: string;
  readonly version: string;
  readonly entry: GreetingEntry;
};

export type GreetingSelection = SelectedGreeting | {
  readonly kind: "unavailable";
  readonly reason: "date-before-launch" | "unknown-version" | "version-not-active";
};

/** Select a fixed daily entry; time period and language never change its identity. */
export function resolveGreetingSelection(
  request: GreetingRequest,
  rotations: readonly GreetingRotation[],
  requestedVersion?: string,
): GreetingSelection {
  const value = GreetingRequestSchema.parse(request);
  const verified = validateGreetingRotations(rotations);
  if (requestedVersion !== undefined && !verified.some((rotation) => rotation.version === requestedVersion)) {
    return { kind: "unavailable", reason: "unknown-version" };
  }
  const requestDayMs = Date.parse(`${value.date}T00:00:00.000Z`);
  const firstRotation = verified[0];
  // At initial release, viewers across the world can still be on the previous local day.
  // Extend only that first day without shifting any published rotation's date mapping.
  const isPreviousLaunchDay = requestDayMs === Date.parse(`${firstRotation.effectiveFrom}T00:00:00.000Z`) - 86_400_000;
  const active = [...verified].reverse().find((rotation) => rotation.effectiveFrom <= value.date)
    ?? (isPreviousLaunchDay ? firstRotation : undefined);
  if (!active) return { kind: "unavailable", reason: "date-before-launch" };
  if (requestedVersion !== undefined && active.version !== requestedVersion) {
    return { kind: "unavailable", reason: "version-not-active" };
  }
  const elapsedDays = (requestDayMs - Date.parse(`${active.effectiveFrom}T00:00:00.000Z`)) / 86_400_000;
  if (!Number.isInteger(elapsedDays) || (elapsedDays < 0 && !(isPreviousLaunchDay && active === firstRotation && elapsedDays === -1))) {
    throw new Error("Greeting rotation day offset is outside its permitted calendar range");
  }
  const entry = active.entries[((elapsedDays % active.entries.length) + active.entries.length) % active.entries.length];
  if (!entry) throw new Error("Greeting rotation has no entry for the selected day");
  return { kind: "selected", date: value.date, version: active.version, entry };
}

/** Derive the public view without exposing provider identifiers or internal provenance. */
export function createGreetingCardDescription(request: GreetingRequest, selection: SelectedGreeting): GreetingCardDescription {
  const value = GreetingRequestSchema.parse(request);
  const entry = GreetingEntrySchema.parse(selection.entry);
  if (selection.kind !== "selected" || selection.date !== value.date) {
    throw new Error("Greeting selection date must match the requested card date");
  }
  const imageRequest = { ...value, version: selection.version };
  return GreetingCardDescriptionSchema.parse({
    ...imageRequest,
    entryId: entry.id,
    greeting: getGreetingLabel(value.locale, value.period),
    dateLabel: formatGreetingDate(value.date, value.locale),
    verse: entry.verse[value.locale],
    reference: entry.reference[value.locale],
    artworkTitle: entry.artworkTitle[value.locale],
    imageUrl: createGreetingImageUrl(imageRequest),
    filename: createGreetingFilename(imageRequest),
  });
}
