import {
  GreetingCardDescriptionSchema,
  type GreetingCardDescription,
  type GreetingRequest,
} from "./contracts.ts";

export const GREET_SHARE_URL = "https://beyond-media.art/greet";

type FetchGreeting = (input: string, init: RequestInit) => Promise<Response>;

/** Loads and validates the exact PNG that will be displayed, shared, and saved. */
export async function loadGreetingCard(
  request: GreetingRequest,
  fetchGreeting: FetchGreeting,
  signal: AbortSignal
): Promise<{ description: GreetingCardDescription; blob: Blob }> {
  signal.throwIfAborted();
  const params = new URLSearchParams(request);
  const response = await fetchGreeting(`/api/greet/card?${params}`, { signal });
  if (!response.ok) throw new Error("Failed to load greeting description");

  const description = GreetingCardDescriptionSchema.parse(await response.json());
  signal.throwIfAborted();
  if (
    description.date !== request.date ||
    description.period !== request.period ||
    description.locale !== request.locale
  ) {
    throw new Error("Greeting description does not match the requested context");
  }

  const image = await fetchGreeting(description.imageUrl, { signal });
  if (!image.ok) throw new Error("Failed to load greeting image");
  const blob = await image.blob();
  if (blob.type !== "image/png" || blob.size < 8 || blob.size > 10 * 1024 * 1024) {
    throw new Error("Greeting image must be a PNG smaller than 10 MB");
  }
  const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!pngSignature.every((value, index) => signature[index] === value)) {
    throw new Error("Greeting image has an invalid PNG signature");
  }
  signal.throwIfAborted();

  return { description, blob };
}

export type GreetingShareOutcome =
  | "shared"
  | "copied"
  | "cancelled"
  | "download-needed"
  | "failed";

type LinkShareEffects = {
  share?: (data: ShareData) => Promise<void>;
  copy?: (text: string) => Promise<void>;
};

/** Opens native link sharing immediately, falling back to copying the invitation URL. */
export async function shareGreetingLink(
  title: string,
  effects: LinkShareEffects
): Promise<GreetingShareOutcome> {
  if (effects.share) {
    try {
      await effects.share({ title, url: GREET_SHARE_URL });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  if (!effects.copy) return "failed";
  try {
    await effects.copy(GREET_SHARE_URL);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Shares a prepared file without awaiting image loading and losing the user gesture. */
export async function shareGreetingImage(
  file: File,
  effects: {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  }
): Promise<GreetingShareOutcome> {
  if (!effects.share || !effects.canShare) return "download-needed";
  try {
    if (!effects.canShare({ files: [file] })) return "download-needed";
    await effects.share({ files: [file] });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}
