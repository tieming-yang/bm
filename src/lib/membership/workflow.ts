import { z } from "zod";
import type { MembershipClaimResult } from "./contracts.ts";
import {
  MembershipUidSchema,
  activateReservedMembership,
  membershipHasPaidAccess,
  reconcileMembershipPurchase,
  reserveMembershipOwnership,
  type MembershipSnapshot,
  type MembershipTransition,
} from "./domain.ts";
import type { MembershipProvider } from "./provider.ts";
import type { MembershipStore } from "./store.ts";

/** Authenticated identity must come from a fresh Firebase user lookup, never checkout input. */
export const MembershipActorSchema = z.object({
  uid: MembershipUidSchema,
  email: z.string().email().nullable(),
  emailVerified: z.boolean(),
}).strict().readonly();
export type MembershipActor = z.infer<typeof MembershipActorSchema>;

/** Explicit provider, persistence, and clock boundaries shared by all recurring entry points. */
export type MembershipWorkflowEffects = {
  provider: MembershipProvider;
  store: MembershipStore;
  now: () => number;
  checkpoint: (event: string, context: Record<string, string>) => void;
};

function checkpoint(effects: MembershipWorkflowEffects, event: string, context: Record<string, string>) {
  try { effects.checkpoint(event, context); } catch { /* Telemetry cannot change payment decisions. */ }
}

function publicClaimResult(transition: MembershipTransition): MembershipClaimResult {
  switch (transition.kind) {
    case "claimed": case "already_claimed": case "payment_pending": case "payment_inactive":
    case "existing_membership": case "claimed_elsewhere": case "profile_pending":
      return { kind: transition.kind };
    case "reserved": case "synchronized": case "ignored":
      throw new Error("Membership workflow returned an unfinished claim transition");
  }
}

async function finishReservedMembership(snapshot: MembershipSnapshot, uid: string, effects: MembershipWorkflowEffects): Promise<MembershipClaimResult> {
  checkpoint(effects, "membership.owner.attach", { source: snapshot.source });
  const attached = await effects.provider.attachOwner(snapshot.subscriptionId, uid);
  if (attached.kind === "conflict") return { kind: "claimed_elsewhere" };

  // Re-read after the external effect: cancellation or failed payment may race a claim.
  const current = await effects.provider.readSessionSnapshot(snapshot.sessionId);
  if (current.kind !== "snapshot") return { kind: current.kind };
  const completed = await effects.store.transact(snapshot.subscriptionId, uid, (state) =>
    activateReservedMembership(current.snapshot, uid, state, effects.now())
  );
  checkpoint(effects, "membership.activation.completed", { source: snapshot.source, outcome: completed.kind });
  return publicClaimResult(completed);
}

/** Claims a guest purchase only for the account controlling the same verified email. */
export async function claimGuestMembership(sessionId: string, inputActor: MembershipActor, effects: MembershipWorkflowEffects): Promise<MembershipClaimResult> {
  const actor = MembershipActorSchema.parse(inputActor);
  if (!actor.emailVerified || !actor.email) return { kind: "email_verification_required" };
  const result = await effects.provider.readSessionSnapshot(sessionId);
  if (result.kind !== "snapshot") return { kind: result.kind };
  const snapshot = result.snapshot;
  if (snapshot.source !== "guest") return { kind: "not_found" };
  if (snapshot.payerEmail !== actor.email.trim().toLowerCase()) return { kind: "email_mismatch" };
  const existing = await effects.store.readPurchase(snapshot.subscriptionId);
  const current = reconcileMembershipPurchase(existing, snapshot, effects.now());
  if (current.ownership.kind !== "unclaimed" && current.ownership.uid !== actor.uid) return { kind: "claimed_elsewhere" };
  if (current.snapshot.paymentState === "pending") return { kind: "payment_pending" };
  if (!membershipHasPaidAccess(current.snapshot, effects.now())) return { kind: "payment_inactive" };
  const reserved = await effects.store.transact(snapshot.subscriptionId, actor.uid, (state) =>
    reserveMembershipOwnership(snapshot, actor.uid, state, effects.now())
  );
  if (reserved.kind !== "reserved") return publicClaimResult(reserved);
  checkpoint(effects, "membership.owner.reserved", { source: snapshot.source });
  return finishReservedMembership(snapshot, actor.uid, effects);
}

/** Reconciles current Stripe evidence; unclaimed guest purchases remain private and unassigned. */
export async function synchronizeRecurringMembership(snapshot: MembershipSnapshot, legacyUid: string | undefined, effects: MembershipWorkflowEffects): Promise<{ kind: string }> {
  const current = await effects.store.readPurchase(snapshot.subscriptionId);
  let uid: string | undefined;
  if (snapshot.source === "guest") {
    uid = current?.ownership.kind === "reserved" || current?.ownership.kind === "claimed" ? current.ownership.uid : undefined;
  } else {
    if (!legacyUid) throw new Error("Legacy recurring checkout has no account owner");
    uid = MembershipUidSchema.parse(legacyUid);
  }
  if (uid === undefined) {
    const result = await effects.store.transact(snapshot.subscriptionId, undefined, (state) => ({
      kind: "synchronized",
      purchase: reconcileMembershipPurchase(state.purchase, snapshot, effects.now()),
    }));
    return { kind: result.kind };
  }
  if (!current || current.ownership.kind === "unclaimed") {
    const reserved = await effects.store.transact(snapshot.subscriptionId, uid, (state) =>
      reserveMembershipOwnership(snapshot, uid!, state, effects.now())
    );
    if (reserved.kind !== "reserved") return { kind: reserved.kind };
  } else {
    if (current.ownership.uid !== uid) return { kind: "claimed_elsewhere" };
    await effects.store.transact(snapshot.subscriptionId, undefined, (state) => ({
      kind: "synchronized",
      purchase: reconcileMembershipPurchase(state.purchase, snapshot, effects.now()),
    }));
  }
  return finishReservedMembership(snapshot, uid, effects);
}
