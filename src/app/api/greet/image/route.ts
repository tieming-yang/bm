import { createGreetingArtworkEffects, loadGreetingArtwork } from "@/lib/greet/artwork";
import { greetingRotations } from "@/lib/greet/content";
import { handleGreetingImageRequest } from "@/lib/greet/http";
import { renderGreetingCard } from "@/lib/greet/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Render the pinned selection from approved gallery artwork and verified scripture. */
export async function GET(request: Request): Promise<Response> {
  try {
    return await handleGreetingImageRequest(request, greetingRotations, {
      loadArtwork: (entry) => {
        const { databaseId, effects } = createGreetingArtworkEffects();
        return loadGreetingArtwork(entry, databaseId, effects);
      },
      render: renderGreetingCard,
      checkpoint: (event, context) => console.info(event, context),
    });
  } catch {
    console.error("greet.image.failed", { stage: "selection" });
    return Response.json({ error: "Failed to render the greeting card" }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
