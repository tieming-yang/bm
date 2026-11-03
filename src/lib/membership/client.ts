import {
  MembershipCheckoutInputSchema,
  MembershipCheckoutResultSchema,
  MembershipClaimInputSchema,
  MembershipClaimResultSchema,
  type MembershipCheckoutInput,
  type MembershipCheckoutResult,
  type MembershipClaimResult,
} from "./contracts.ts";

type MembershipFetch = (url: string, init: RequestInit) => Promise<Response>;

/** Creates or resumes the caller's checkout attempt; callers retain its UUID for retries. */
export async function requestMembershipCheckout(
  input: MembershipCheckoutInput,
  request: MembershipFetch,
  signal: AbortSignal
): Promise<MembershipCheckoutResult> {
  const payload = MembershipCheckoutInputSchema.parse(input);
  signal.throwIfAborted();
  const response = await request("/api/membership/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });
  const result = MembershipCheckoutResultSchema.parse(await response.json());
  signal.throwIfAborted();
  const expectedStatus = result.kind === "checkout" ? 200 : result.kind === "invalid_request" ? 400 : 503;
  if (response.status !== expectedStatus) throw new Error("Unexpected membership checkout response status");
  return result;
}

/** Claims a paid session with an authenticated token, never with identity from URL parameters. */
export async function requestMembershipClaim(
  sessionId: string,
  token: string,
  request: MembershipFetch,
  signal: AbortSignal
): Promise<MembershipClaimResult> {
  const payload = MembershipClaimInputSchema.parse({ sessionId });
  if (!token || /\s/.test(token)) throw new Error("Missing or malformed membership authentication token");
  signal.throwIfAborted();
  const response = await request("/api/membership/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });
  const result = MembershipClaimResultSchema.parse(await response.json());
  signal.throwIfAborted();
  const expectedStatus = result.kind === "authentication_required" ? 401
    : result.kind === "invalid_request" ? 400
    : result.kind === "retryable_failure" ? 503 : 200;
  if (response.status !== expectedStatus) throw new Error("Unexpected membership claim response status");
  return result;
}

/** Chooses the useful next action for each server-verified claim outcome. */
export function getMembershipClaimRecovery(kind: MembershipClaimResult["kind"]) {
  switch (kind) {
    case "claimed":
    case "already_claimed":
      return "complete";
    case "email_verification_required":
      return "verify-email";
    case "email_mismatch":
    case "authentication_required":
      return "sign-in";
    case "payment_pending":
    case "profile_pending":
    case "retryable_failure":
      return "retry";
    case "existing_membership":
      return "account";
    case "payment_inactive":
    case "claimed_elsewhere":
    case "not_found":
    case "invalid_request":
      return "contact";
    default:
      return kind satisfies never;
  }
}

/** Keeps the validated session attached through sign-in, signup, and email verification. */
export function createMembershipClaimPath(sessionId: string) {
  const input = MembershipClaimInputSchema.parse({ sessionId });
  return `/glory-share/claim?${new URLSearchParams({ session_id: input.sessionId })}`;
}
