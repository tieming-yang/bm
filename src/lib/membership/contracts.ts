import { z } from "zod";

/** Guest Checkout accepts an idempotent attempt, never account or pricing authority. */
export const MembershipCheckoutInputSchema = z.object({
  attemptId: z.string().uuid(),
  locale: z.enum(["en", "zh-TW"]),
}).strict().readonly();
export type MembershipCheckoutInput = z.infer<typeof MembershipCheckoutInputSchema>;

/** Only Stripe's hosted Checkout URL may be returned for browser navigation. */
export const MembershipCheckoutUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "checkout.stripe.com" &&
    !url.username && !url.password && !url.port;
}, "Invalid Stripe Checkout URL");

/** Public Checkout outcomes contain no provider identifiers or payer information. */
export const MembershipCheckoutResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("checkout"), url: MembershipCheckoutUrlSchema }).strict(),
  z.object({ kind: z.literal("invalid_request") }).strict(),
  z.object({ kind: z.literal("retryable_failure") }).strict(),
]);
export type MembershipCheckoutResult = z.infer<typeof MembershipCheckoutResultSchema>;

/** Stripe's opaque session identifier is used only to find a server-verified purchase. */
export const MembershipSessionIdSchema = z.string().regex(/^cs_(?:test_|live_)?[A-Za-z0-9]+$/).max(255);

/** Claim input cannot assign an owner; the verified Firebase identity determines it. */
export const MembershipClaimInputSchema = z.object({ sessionId: MembershipSessionIdSchema }).strict().readonly();
export type MembershipClaimInput = z.infer<typeof MembershipClaimInputSchema>;

/** Every expected claim outcome is safe to return without disclosing the payer email. */
export const MembershipClaimResultSchema = z.object({ kind: z.enum([
  "claimed", "already_claimed", "email_verification_required", "email_mismatch",
  "payment_pending", "payment_inactive", "existing_membership", "claimed_elsewhere",
  "profile_pending", "not_found", "authentication_required", "invalid_request", "retryable_failure",
]) }).strict().readonly();
export type MembershipClaimResult = z.infer<typeof MembershipClaimResultSchema>;
