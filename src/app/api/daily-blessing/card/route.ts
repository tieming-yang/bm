import { greetingRotations } from "@/lib/greet/content";
import { handleGreetingCardRequest } from "@/lib/greet/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Describe the daily greeting without returning private gallery identifiers. */
export function GET(request: Request): Response {
  try {
    return handleGreetingCardRequest(request, greetingRotations);
  } catch {
    console.error("greet.card.failed", { stage: "description" });
    return Response.json({ error: "Failed to describe the greeting card" }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
