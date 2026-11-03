import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { MembershipClaimInputSchema, MembershipClaimResultSchema } from "@/lib/membership/contracts";
import { createMembershipEffects } from "@/lib/membership/runtime";
import { claimGuestMembership } from "@/lib/membership/workflow";

export const runtime = "nodejs";

/** Claims paid membership using fresh Firebase email verification and transactional ownership. */
export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return Response.json({ kind: "authentication_required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  let input: unknown;
  try { input = await request.json(); } catch {
    return Response.json({ kind: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = MembershipClaimInputSchema.safeParse(input);
  if (!parsed.success) return Response.json({ kind: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  let stage = "authentication";
  try {
    let actor;
    try {
      const decoded = await firebaseAdmin.auth.verifyIdToken(token, true);
      // Token email claims can remain stale after verification or an email change.
      actor = await firebaseAdmin.auth.getUser(decoded.uid);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && [
        "auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired", "auth/id-token-revoked",
        "auth/user-disabled", "auth/user-not-found",
      ].includes(error.code)) {
        return Response.json({ kind: "authentication_required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      throw error;
    }
    if (actor.disabled) return Response.json({ kind: "authentication_required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    stage = "claim";
    const result = await claimGuestMembership(parsed.data.sessionId, {
      uid: actor.uid,
      email: actor.email ?? null,
      emailVerified: actor.emailVerified,
    }, createMembershipEffects());
    return Response.json(MembershipClaimResultSchema.parse(result), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("membership.claim.failed", { stage, errorType: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ kind: "retryable_failure" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
