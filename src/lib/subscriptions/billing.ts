import { z } from "zod";
import { MembershipStatusSchema, MembershipSubscriptionIdSchema } from "../membership/domain.ts";

const BillingProfileSchema = z.object({
  lastSubscriptionId: MembershipSubscriptionIdSchema.optional(),
  subscriptions: z.array(z.object({ id: MembershipSubscriptionIdSchema, status: MembershipStatusSchema })).optional(),
});

/** Billing can remain open after paid access expires; use the canonical current subscription. */
export function hasOpenRecurringBilling(input: unknown): boolean {
  if (input === undefined) return false;
  const profile = BillingProfileSchema.parse(input);
  if (!profile.lastSubscriptionId) return false;
  const current = profile.subscriptions?.find((subscription) => subscription.id === profile.lastSubscriptionId);
  if (!current) throw new Error("Current membership subscription is missing from the profile");
  return current.status !== "canceled" && current.status !== "incomplete_expired";
}
