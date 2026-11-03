import { z } from "zod";
import { MembershipSessionIdSchema } from "./contracts.ts";

/** Server-owned Stripe marker separating guest claims from legacy account checkout. */
export const GUEST_MEMBERSHIP_PURPOSE = "guest_membership_v1";
/** Firebase account identifier safe to use as one private document path segment. */
export const MembershipUidSchema = z.string().min(1).max(128).refine((value) => !value.includes("/") && value !== "." && value !== "..");
/** Provider subscription identifier used by the canonical purchase and existing cancellation flow. */
export const MembershipSubscriptionIdSchema = z.string().regex(/^sub_[A-Za-z0-9]+$/);
/** Every Stripe subscription lifecycle state is handled explicitly by the paid-through policy. */
export const MembershipStatusSchema = z.enum(["active", "canceled", "incomplete", "incomplete_expired", "past_due", "paused", "trialing", "unpaid"]);
const milliseconds = z.number().int().nonnegative().safe();

/** Provider evidence is private and validated before any ownership or entitlement transition. */
export const MembershipSnapshotSchema = z.object({
  sessionId: MembershipSessionIdSchema,
  subscriptionId: MembershipSubscriptionIdSchema,
  customerId: z.string().regex(/^cus_[A-Za-z0-9]+$/),
  priceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
  plan: z.enum(["monthly", "yearly"]),
  source: z.enum(["guest", "legacy"]),
  payerEmail: z.string().email().refine((email) => email === email.trim().toLowerCase()),
  paymentState: z.enum(["pending", "paid", "failed"]),
  subscriptionStatus: MembershipStatusSchema,
  startedAtMs: milliseconds,
  endedAtMs: milliseconds.nullable(),
  canceledAtMs: milliseconds.nullable(),
  currentPeriodStartMs: milliseconds,
  currentPeriodEndMs: milliseconds,
  paidThroughMs: milliseconds,
  providerObservedAtMs: milliseconds,
  eventId: z.string().regex(/^evt_[A-Za-z0-9]+$/).nullable(),
  eventCreatedMs: milliseconds.nullable(),
}).strict().superRefine((value, context) => {
  if (value.currentPeriodEndMs <= value.currentPeriodStartMs) context.addIssue({ code: "custom", message: "Subscription period must have positive duration" });
  if (value.startedAtMs > value.currentPeriodStartMs) context.addIssue({ code: "custom", message: "Subscription cannot start after its current period" });
  if (value.endedAtMs !== null && value.endedAtMs < value.startedAtMs) context.addIssue({ code: "custom", message: "Subscription cannot end before it starts" });
  if (value.canceledAtMs !== null && value.canceledAtMs < value.startedAtMs) context.addIssue({ code: "custom", message: "Subscription cannot be canceled before it starts" });
  if ((value.eventId === null) !== (value.eventCreatedMs === null)) context.addIssue({ code: "custom", message: "Provider event identity and timestamp must be supplied together" });
  if (value.paidThroughMs > value.currentPeriodEndMs) context.addIssue({ code: "custom", message: "Paid entitlement cannot exceed the provider period" });
}).readonly();
export type MembershipSnapshot = z.infer<typeof MembershipSnapshotSchema>;

const ownership = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unclaimed") }).strict(),
  z.object({ kind: z.literal("reserved"), uid: MembershipUidSchema, reservedAtMs: milliseconds }).strict(),
  z.object({ kind: z.literal("claimed"), uid: MembershipUidSchema, reservedAtMs: milliseconds, claimedAtMs: milliseconds }).strict(),
]);

/** Private canonical purchase; this must never be stored under client-readable profiles. */
export const MembershipPurchaseSchema = z.object({
  schemaVersion: z.literal(1),
  snapshot: MembershipSnapshotSchema,
  ownership,
  createdAtMs: milliseconds,
  updatedAtMs: milliseconds,
}).strict().superRefine((value, context) => {
  if (value.updatedAtMs < value.createdAtMs) context.addIssue({ code: "custom", message: "Purchase update timestamp moved backwards" });
  if (value.snapshot.providerObservedAtMs > value.updatedAtMs) context.addIssue({ code: "custom", message: "Purchase provider observation is newer than its persisted update" });
  if (value.ownership.kind !== "unclaimed" && (value.ownership.reservedAtMs < value.createdAtMs || value.ownership.reservedAtMs > value.updatedAtMs)) context.addIssue({ code: "custom", message: "Purchase reservation timestamp is outside its lifecycle" });
  if (value.ownership.kind === "claimed" && (value.ownership.claimedAtMs < value.ownership.reservedAtMs || value.ownership.claimedAtMs > value.updatedAtMs)) context.addIssue({ code: "custom", message: "Purchase claim timestamp is outside its lifecycle" });
}).readonly();
export type MembershipPurchase = z.infer<typeof MembershipPurchaseSchema>;

/** Private per-account reservation prevents concurrent purchases from claiming one free account. */
export const MembershipAccountClaimSchema = z.object({
  uid: MembershipUidSchema,
  subscriptionId: MembershipSubscriptionIdSchema,
  createdAtMs: milliseconds,
  updatedAtMs: milliseconds,
}).strict().refine((value) => value.updatedAtMs >= value.createdAtMs).readonly();
export type MembershipAccountClaim = z.infer<typeof MembershipAccountClaimSchema>;

/** Only server-owned profile fields participate in membership eligibility. */
export const MembershipProfileSchema = z.object({
  memberType: z.enum(["free", "monthly", "yearly", "lifeTime"]).optional(),
  lastSubscriptionId: MembershipSubscriptionIdSchema.optional(),
}).readonly();
export type MembershipProfile = z.infer<typeof MembershipProfileSchema>;

/** Minimal existing subscription view needed to avoid creating overlapping memberships. */
export const MembershipExistingSubscriptionSchema = z.object({
  id: MembershipSubscriptionIdSchema,
  status: MembershipStatusSchema,
  currentPeriodEndMs: milliseconds,
}).strict().readonly();
export type MembershipExistingSubscription = z.infer<typeof MembershipExistingSubscriptionSchema>;

/** One transaction reads the purchase, account, existing subscriptions, and prior account reservation. */
export type MembershipTransactionState = {
  purchase: MembershipPurchase | null;
  profile: MembershipProfile | null;
  subscriptions: readonly MembershipExistingSubscription[];
  accountClaim: MembershipAccountClaim | null;
  accountPurchase: MembershipPurchase | null;
};

export type MembershipTransitionKind = "reserved" | "synchronized" | "ignored" | "claimed" | "already_claimed" | "payment_pending" | "payment_inactive" | "existing_membership" | "claimed_elsewhere" | "profile_pending";

/** Explicit writes from the pure aggregate policy; effect adapters only persist this decision. */
export type MembershipTransition = {
  kind: MembershipTransitionKind;
  purchase?: MembershipPurchase;
  accountClaim?: MembershipAccountClaim;
  projection?: { uid: string; snapshot: MembershipSnapshot; grant: "monthly" | "yearly" | "free" | "unchanged" };
};

/** Reject changes to immutable provider identity and retain the latest proven paid-through boundary. */
export function reconcileMembershipPurchase(existing: MembershipPurchase | null, input: MembershipSnapshot, nowMs: number): MembershipPurchase {
  const snapshot = MembershipSnapshotSchema.parse(input);
  milliseconds.parse(nowMs);
  if (snapshot.providerObservedAtMs > nowMs) throw new Error("Membership observation timestamp is in the future");
  if (!existing) return MembershipPurchaseSchema.parse({ schemaVersion: 1, snapshot, ownership: { kind: "unclaimed" }, createdAtMs: nowMs, updatedAtMs: nowMs });
  const purchase = MembershipPurchaseSchema.parse(existing);
  if (nowMs < purchase.updatedAtMs) throw new Error("Membership update clock moved backwards");
  for (const key of ["sessionId", "subscriptionId", "customerId", "priceId", "plan", "source", "payerEmail", "startedAtMs"] as const) {
    if (purchase.snapshot[key] !== snapshot[key]) throw new Error(`Membership ${key} changed`);
  }
  if (snapshot.providerObservedAtMs < purchase.snapshot.providerObservedAtMs ||
    (snapshot.eventCreatedMs !== null && purchase.snapshot.eventCreatedMs !== null && snapshot.eventCreatedMs < purchase.snapshot.eventCreatedMs)) return purchase;
  if (purchase.snapshot.subscriptionStatus === "canceled" && snapshot.subscriptionStatus !== "canceled") throw new Error("Canceled membership subscription cannot become active again");
  if (snapshot.currentPeriodEndMs < purchase.snapshot.currentPeriodEndMs) throw new Error("Membership provider period moved backwards");
  return MembershipPurchaseSchema.parse({
    ...purchase,
    snapshot: {
      ...snapshot,
      paidThroughMs: Math.max(snapshot.paidThroughMs, purchase.snapshot.paidThroughMs),
      eventId: snapshot.eventId ?? purchase.snapshot.eventId,
      eventCreatedMs: snapshot.eventCreatedMs ?? purchase.snapshot.eventCreatedMs,
    },
    updatedAtMs: nowMs,
  });
}

/** Canceled subscriptions keep access only through their previously paid period. */
export function membershipHasPaidAccess(snapshot: MembershipSnapshot, nowMs: number): boolean {
  return snapshot.paymentState === "paid" && snapshot.paidThroughMs > nowMs &&
    snapshot.subscriptionStatus !== "incomplete" && snapshot.subscriptionStatus !== "incomplete_expired";
}

/** Project the fields required by existing membership UI and expiry without payer or billing identifiers. */
export function createMembershipSubscriptionView(snapshot: MembershipSnapshot) {
  const value = MembershipSnapshotSchema.parse(snapshot);
  return {
    id: value.subscriptionId,
    status: value.subscriptionStatus,
    startDate: value.startedAtMs / 1000,
    endAt: value.endedAtMs === null ? null : value.endedAtMs / 1000,
    canceledAt: value.canceledAtMs === null ? null : value.canceledAtMs / 1000,
    currentPeriodStart: value.currentPeriodStartMs / 1000,
    currentPeriodEnd: value.paidThroughMs / 1000,
    entitlementPolicy: "paid_period_v1" as const,
  };
}

function accountConflict(state: MembershipTransactionState, subscriptionId: string, nowMs: number): MembershipTransitionKind | null {
  if (!state.profile || state.profile.memberType === undefined) return "profile_pending";
  if (state.profile.memberType === "lifeTime" ||
    (state.profile.memberType !== "free" && state.profile.lastSubscriptionId !== subscriptionId)) return "existing_membership";
  if (state.subscriptions.some((sub) => sub.id !== subscriptionId &&
    (!(["canceled", "incomplete_expired"] as string[]).includes(sub.status) || sub.currentPeriodEndMs > nowMs))) return "existing_membership";
  if (state.accountClaim && state.accountClaim.subscriptionId !== subscriptionId) {
    if (!state.accountPurchase || state.accountPurchase.ownership.kind === "unclaimed") throw new Error("Account membership reservation has no matching owned purchase");
    if (state.accountPurchase.ownership.kind === "reserved" &&
      !(state.accountPurchase.snapshot.paidThroughMs <= nowMs &&
        ["canceled", "incomplete_expired"].includes(state.accountPurchase.snapshot.subscriptionStatus))) return "payment_pending";
    if (!(["canceled", "incomplete_expired"] as string[]).includes(state.accountPurchase.snapshot.subscriptionStatus) ||
      membershipHasPaidAccess(state.accountPurchase.snapshot, nowMs)) return "existing_membership";
  }
  return null;
}

/** Reserve a single owner and the account before any Stripe ownership metadata write. */
export function reserveMembershipOwnership(input: MembershipSnapshot, uid: string, state: MembershipTransactionState, nowMs: number): MembershipTransition {
  MembershipUidSchema.parse(uid);
  const purchase = reconcileMembershipPurchase(state.purchase, input, nowMs);
  if (purchase.ownership.kind !== "unclaimed" && purchase.ownership.uid !== uid) return { kind: "claimed_elsewhere" };
  if (purchase.snapshot.paymentState === "pending") return { kind: "payment_pending", purchase };
  if (purchase.snapshot.paymentState !== "paid") return { kind: "payment_inactive", purchase };
  const conflict = accountConflict(state, purchase.snapshot.subscriptionId, nowMs);
  if (conflict) return { kind: conflict, purchase };
  if (state.accountClaim?.uid !== undefined && state.accountClaim.uid !== uid) throw new Error("Account membership reservation owner changed");
  if (state.accountClaim && nowMs < state.accountClaim.updatedAtMs) throw new Error("Account membership reservation timestamp moved backwards");
  const ownership = purchase.ownership.kind === "unclaimed"
    ? { kind: "reserved" as const, uid, reservedAtMs: nowMs }
    : purchase.ownership;
  return {
    kind: "reserved",
    purchase: MembershipPurchaseSchema.parse({ ...purchase, ownership, updatedAtMs: nowMs }),
    accountClaim: MembershipAccountClaimSchema.parse({ uid, subscriptionId: purchase.snapshot.subscriptionId, createdAtMs: state.accountClaim?.createdAtMs ?? nowMs, updatedAtMs: nowMs }),
  };
}

/** Finish or reconcile recurring access in the same transaction that claims the purchase. */
export function activateReservedMembership(input: MembershipSnapshot, uid: string, state: MembershipTransactionState, nowMs: number): MembershipTransition {
  MembershipUidSchema.parse(uid);
  const purchase = reconcileMembershipPurchase(state.purchase, input, nowMs);
  if (purchase.ownership.kind === "unclaimed") throw new Error("Membership must reserve ownership before activation");
  if (purchase.ownership.uid !== uid) return { kind: "claimed_elsewhere" };
  if (!state.profile || state.profile.memberType === undefined) return { kind: "profile_pending", purchase };
  if (!membershipHasPaidAccess(purchase.snapshot, nowMs)) {
    const grant = state.profile.lastSubscriptionId === input.subscriptionId && (state.profile.memberType === "monthly" || state.profile.memberType === "yearly") ? "free" : "unchanged";
    return { kind: "payment_inactive", purchase, projection: { uid, snapshot: purchase.snapshot, grant } };
  }
  if (purchase.ownership.kind === "reserved" && (!state.accountClaim || state.accountClaim.uid !== uid || state.accountClaim.subscriptionId !== input.subscriptionId)) throw new Error("Membership account reservation changed before activation");
  const conflict = accountConflict(state, purchase.snapshot.subscriptionId, nowMs);
  if (conflict) return { kind: conflict, purchase };
  const wasClaimed = purchase.ownership.kind === "claimed";
  const ownership = wasClaimed ? purchase.ownership : { ...purchase.ownership, kind: "claimed" as const, claimedAtMs: nowMs };
  return {
    kind: wasClaimed ? "already_claimed" : "claimed",
    purchase: MembershipPurchaseSchema.parse({ ...purchase, ownership, updatedAtMs: nowMs }),
    projection: { uid, snapshot: purchase.snapshot, grant: purchase.snapshot.plan },
  };
}
