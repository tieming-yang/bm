import { MembershipCheckoutInputSchema, MembershipCheckoutResultSchema } from "@/lib/membership/contracts";
import { createMembershipEffects } from "@/lib/membership/runtime";

export const runtime = "nodejs";

/** Starts the fixed monthly guest membership Checkout; final payment remains on Stripe. */
export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try { input = await request.json(); } catch {
    return Response.json({ kind: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = MembershipCheckoutInputSchema.safeParse(input);
  if (!parsed.success) return Response.json({ kind: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await createMembershipEffects().provider.createGuestCheckout(parsed.data);
    return Response.json(MembershipCheckoutResultSchema.parse(result), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("membership.checkout.failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ kind: "retryable_failure" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
