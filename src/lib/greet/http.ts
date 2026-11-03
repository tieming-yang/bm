import { parseGreetingImageRequest, parseGreetingRequest } from "./contracts.ts";
import type { GreetingCardDescription } from "./contracts.ts";
import { createGreetingCardDescription, resolveGreetingSelection } from "./policy.ts";
import type { GreetingEntry, GreetingRotation } from "./policy.ts";
import type { GreetingArtwork, GreetingArtworkResult } from "./artwork.ts";

/** Explicit image workflow boundaries used by the route and small fake-adapter tests. */
export type GreetingImageEffects = {
  loadArtwork: (entry: GreetingEntry) => Promise<GreetingArtworkResult>;
  render: (card: GreetingCardDescription, artwork: GreetingArtwork) => Promise<Uint8Array>;
  checkpoint: (event: string, context: Record<string, string>) => void;
};

function readUniqueQuery(request: Request): Record<string, string> | undefined {
  const params = new URL(request.url).searchParams;
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(result, key)) return undefined;
    Object.defineProperty(result, key, { value, enumerable: true });
  }
  return result;
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function recordCheckpoint(effects: GreetingImageEffects, event: string, context: Record<string, string>): void {
  try {
    effects.checkpoint(event, context);
  } catch {
    // Diagnostics must not change the selected card or interrupt its delivery.
  }
}

/** Returns only validated public card data; the endpoint never serializes an editorial entry. */
export function handleGreetingCardRequest(request: Request, rotations: readonly GreetingRotation[]): Response {
  const parsed = parseGreetingRequest(readUniqueQuery(request));
  if (parsed.kind === "invalid") return errorResponse(parsed.message, 400);
  const selected = resolveGreetingSelection(parsed.value, rotations);
  if (selected.kind === "unavailable") return errorResponse("Greeting is not available for this date", 404);
  return Response.json(createGreetingCardDescription(parsed.value, selected), {
    headers: { "Cache-Control": "no-store" },
  });
}

/** Resolves, loads, and buffers a pinned card in that order; expected unavailability stays explicit. */
export async function handleGreetingImageRequest(
  request: Request,
  rotations: readonly GreetingRotation[],
  effects: GreetingImageEffects,
): Promise<Response> {
  const parsed = parseGreetingImageRequest(readUniqueQuery(request));
  if (parsed.kind === "invalid") return errorResponse(parsed.message, 400);
  const { version, ...context } = parsed.value;
  const selected = resolveGreetingSelection(context, rotations, version);
  if (selected.kind === "unavailable") {
    return selected.reason === "version-not-active"
      ? errorResponse("Greeting content changed; reload the card", 409)
      : errorResponse("Greeting image is not available", 404);
  }
  const card = createGreetingCardDescription(context, selected);
  const checkpointContext = { ...context, version, entryId: selected.entry.id };
  let stage = "artwork";
  try {
    recordCheckpoint(effects, "greet.image.started", checkpointContext);
    const result = await effects.loadArtwork(selected.entry);
    if (result.kind === "unavailable") {
      recordCheckpoint(effects, "greet.image.unavailable", { ...checkpointContext, reason: result.reason });
      return new Response(JSON.stringify({ error: "Greeting artwork is temporarily unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "60" },
      });
    }
    recordCheckpoint(effects, "greet.image.artwork_loaded", checkpointContext);
    stage = "render";
    const bytes = await effects.render(card, result.artwork);
    if (Array.from(bytes.subarray(0, 8)).join(",") !== "137,80,78,71,13,10,26,10") {
      throw new Error("Greeting renderer did not return a PNG");
    }
    recordCheckpoint(effects, "greet.image.completed", checkpointContext);
    return new Response(new Uint8Array(bytes).buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${card.filename}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    recordCheckpoint(effects, "greet.image.failed", {
      ...checkpointContext,
      stage,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("Failed to render the greeting card", 500);
  }
}
