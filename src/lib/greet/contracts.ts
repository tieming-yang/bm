import { z } from "zod";

/** Supported greeting-card languages; callers resolve the site's language first. */
export const GreetingLocaleSchema = z.enum(["en", "zh-TW"]);
export type GreetingLocale = z.infer<typeof GreetingLocaleSchema>;

/** Local-time periods used by the greeting card. */
export const GreetingPeriodSchema = z.enum(["morning", "afternoon", "evening", "night"]);
export type GreetingPeriod = z.infer<typeof GreetingPeriodSchema>;

/** A real Gregorian calendar date, independent of any server timezone. */
export const GreetingDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Invalid calendar date");

/** Public request data; artwork identifiers and text are always selected by the server. */
export const GreetingRequestSchema = z.object({
  date: GreetingDateSchema,
  period: GreetingPeriodSchema,
  locale: GreetingLocaleSchema,
}).strict().readonly();
export type GreetingRequest = z.infer<typeof GreetingRequestSchema>;

/** A pinned rendering request for an immutable editorial rotation. */
export const GreetingImageRequestSchema = z.object({
  date: GreetingDateSchema,
  period: GreetingPeriodSchema,
  locale: GreetingLocaleSchema,
  version: z.string().regex(/^v[1-9]\d*$/),
}).strict().readonly();
export type GreetingImageRequest = z.infer<typeof GreetingImageRequestSchema>;

const greetingLabels: Record<GreetingLocale, Record<GreetingPeriod, string>> = {
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Good night",
  },
  "zh-TW": {
    morning: "早安",
    afternoon: "午安",
    evening: "晚上好",
    night: "晚安",
  },
};

/** Resolve the exact greeting label for a validated language and period. */
export function getGreetingLabel(locale: GreetingLocale, period: GreetingPeriod): string {
  return greetingLabels[GreetingLocaleSchema.parse(locale)][GreetingPeriodSchema.parse(period)];
}

/** Format a calendar date without letting the rendering server change its day. */
export function formatGreetingDate(value: string, locale: GreetingLocale): string {
  const date = new Date(`${GreetingDateSchema.parse(value)}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(GreetingLocaleSchema.parse(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Build the sole same-origin image endpoint accepted in public card descriptions. */
export function createGreetingImageUrl(request: GreetingImageRequest): string {
  const value = GreetingImageRequestSchema.parse(request);
  return `/api/daily-blessing/image?${new URLSearchParams({
    date: value.date,
    period: value.period,
    locale: value.locale,
    version: value.version,
  }).toString()}`;
}

/** Produce a predictable, path-free filename for the exact displayed card. */
export function createGreetingFilename(request: GreetingImageRequest): string {
  const value = GreetingImageRequestSchema.parse(request);
  return `beyond-greeting-${value.date}-${value.period}-${value.locale}-${value.version}.png`;
}

/** Safe client-readable card data, with rendering fields checked against its request. */
export const GreetingCardDescriptionSchema = z.object({
  date: GreetingDateSchema,
  period: GreetingPeriodSchema,
  locale: GreetingLocaleSchema,
  version: z.string().regex(/^v[1-9]\d*$/),
  entryId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  greeting: z.string().min(1).max(40),
  dateLabel: z.string().min(1).max(80),
  verse: z.string().min(1).max(320),
  reference: z.string().min(1).max(100),
  artworkTitle: z.string().min(1).max(100),
  imageUrl: z.string().min(1).max(250),
  filename: z.string().min(1).max(120),
}).strict().superRefine((value, context) => {
  const request = GreetingImageRequestSchema.safeParse({
    date: value.date,
    period: value.period,
    locale: value.locale,
    version: value.version,
  });
  if (!request.success) return;
  const expected = {
    greeting: getGreetingLabel(value.locale, value.period),
    dateLabel: formatGreetingDate(value.date, value.locale),
    imageUrl: createGreetingImageUrl(request.data),
    filename: createGreetingFilename(request.data),
  };
  for (const field of ["greeting", "dateLabel", "imageUrl", "filename"] as const) {
    if (value[field] !== expected[field]) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} does not match the greeting request` });
    }
  }
}).readonly();
export type GreetingCardDescription = z.infer<typeof GreetingCardDescriptionSchema>;

export type GreetingParseResult<T> =
  | { readonly kind: "valid"; readonly value: T }
  | { readonly kind: "invalid"; readonly message: string };

/** Treat malformed public requests as explicit expected outcomes. */
export function parseGreetingRequest(input: unknown): GreetingParseResult<GreetingRequest> {
  const parsed = GreetingRequestSchema.safeParse(input);
  return parsed.success
    ? { kind: "valid", value: parsed.data }
    : { kind: "invalid", message: "Invalid greeting request: date, period, and locale must match the supported contract" };
}

/** Validate a pinned rendering request without throwing for caller input. */
export function parseGreetingImageRequest(input: unknown): GreetingParseResult<GreetingImageRequest> {
  const parsed = GreetingImageRequestSchema.safeParse(input);
  return parsed.success
    ? { kind: "valid", value: parsed.data }
    : { kind: "invalid", message: "Invalid greeting image request: date, period, locale, and version must match the supported contract" };
}

/** Read the viewer's local date and period; invalid clock values are internal failures. */
export function getLocalGreetingContext(now: Date, locale: GreetingLocale): GreetingRequest {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Greeting clock must be a valid Date");
  }
  const hour = now.getHours();
  const period = hour >= 5 && hour < 12 ? "morning"
    : hour >= 12 && hour < 18 ? "afternoon"
    : hour >= 18 && hour < 21 ? "evening" : "night";
  const date = `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return GreetingRequestSchema.parse({ date, period, locale });
}

/** Schedule the next local greeting or date change, including DST-length days. */
export function millisecondsUntilNextGreetingBoundary(now: Date): number {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Greeting clock must be a valid Date");
  }
  const boundaries = [5, 12, 18, 21, 24].map((hour) => {
    const boundary = new Date(now.getTime());
    boundary.setHours(hour, 0, 0, 0);
    return boundary.getTime();
  });
  const next = boundaries.find((boundary) => boundary > now.getTime());
  if (next === undefined) throw new Error("Greeting clock has no next local boundary");
  return next - now.getTime();
}
