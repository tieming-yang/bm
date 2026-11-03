import test from "node:test";
import assert from "node:assert/strict";
import {
  MembershipPurchaseSchema,
  MembershipSnapshotSchema,
  activateReservedMembership,
  createMembershipSubscriptionView,
  reconcileMembershipPurchase,
  type MembershipAccountClaim,
  type MembershipExistingSubscription,
  type MembershipProfile,
  type MembershipPurchase,
  type MembershipSnapshot,
} from "./domain.ts";
import { claimGuestMembership, synchronizeRecurringMembership, type MembershipWorkflowEffects } from "./workflow.ts";
import type { MembershipStore } from "./store.ts";

const actor = { uid: "accountA", email: "payer@example.com", emailVerified: true };

function snapshot(changes: Partial<MembershipSnapshot> = {}): MembershipSnapshot {
  return MembershipSnapshotSchema.parse({
    sessionId: "cs_test_one", subscriptionId: "sub_one", customerId: "cus_one", priceId: "price_monthly",
    plan: "monthly", source: "guest", payerEmail: "payer@example.com", paymentState: "paid",
    subscriptionStatus: "active", startedAtMs: 1000, endedAtMs: null, canceledAtMs: null,
    currentPeriodStartMs: 1000, currentPeriodEndMs: 10000, paidThroughMs: 10000,
    providerObservedAtMs: 2000, eventId: null, eventCreatedMs: null,
    ...changes,
  });
}

function harness(initial = snapshot()) {
  let clock = 2000;
  const purchases = new Map<string, MembershipPurchase>();
  const profiles = new Map<string, MembershipProfile>([[actor.uid, { memberType: "free" }]]);
  const subscriptions = new Map<string, MembershipExistingSubscription[]>();
  const accountClaims = new Map<string, MembershipAccountClaim>();
  const providerOwners = new Map<string, string>();
  const providerSnapshots = new Map<string, MembershipSnapshot>([[initial.sessionId, initial]]);
  let queue = Promise.resolve();
  let failProjection = false;
  let ownerWrites = 0;
  const store: MembershipStore = {
    readPurchase: async (id) => purchases.get(id) ?? null,
    transact: (id, uid, decide) => {
      const result = queue.then(() => {
        const accountClaim = uid ? accountClaims.get(uid) ?? null : null;
        const decision = decide({
          purchase: purchases.get(id) ?? null,
          profile: uid ? profiles.get(uid) ?? null : null,
          subscriptions: uid ? subscriptions.get(uid) ?? [] : [],
          accountClaim,
          accountPurchase: accountClaim ? purchases.get(accountClaim.subscriptionId) ?? null : null,
        });
        if (failProjection && decision.projection) throw new Error("Injected transaction failure");
        if (decision.purchase) purchases.set(id, MembershipPurchaseSchema.parse(decision.purchase));
        if (decision.accountClaim) accountClaims.set(decision.accountClaim.uid, decision.accountClaim);
        if (decision.projection) {
          const projection = decision.projection;
          const others = (subscriptions.get(projection.uid) ?? []).filter((sub) => sub.id !== id);
          subscriptions.set(projection.uid, [...others, { id, status: projection.snapshot.subscriptionStatus, currentPeriodEndMs: projection.snapshot.paidThroughMs }]);
          if (projection.grant !== "unchanged") {
            profiles.set(projection.uid, { ...profiles.get(projection.uid), memberType: projection.grant, ...(projection.grant === "free" ? {} : { lastSubscriptionId: id }) });
          }
        }
        return decision;
      });
      queue = result.then(() => {}, () => {});
      return result;
    },
  };
  const effects: MembershipWorkflowEffects = {
    store,
    now: () => clock,
    checkpoint: () => {},
    provider: {
      createGuestCheckout: async () => ({ kind: "checkout", url: "https://checkout.stripe.com/c/pay/test" }),
      readSessionSnapshot: async (id) => {
        const value = providerSnapshots.get(id);
        return value ? { kind: "snapshot", snapshot: { ...value, providerObservedAtMs: clock } } : { kind: "not_found" };
      },
      readSubscriptionSnapshot: async (id) => {
        const value = [...providerSnapshots.values()].find((item) => item.subscriptionId === id);
        return value ? { kind: "snapshot", snapshot: { ...value, providerObservedAtMs: clock } } : { kind: "not_found" };
      },
      attachOwner: async (id, uid) => {
        const existing = providerOwners.get(id);
        if (existing && existing !== uid) return { kind: "conflict" };
        if (!existing) { ownerWrites += 1; providerOwners.set(id, uid); }
        return { kind: "attached" };
      },
      readSubscriptionRouting: async (id) => {
        const value = [...providerSnapshots.values()].find((item) => item.subscriptionId === id);
        return value ? { source: value.source, ownerUid: providerOwners.get(id) } : null;
      },
    },
  };
  return { effects, purchases, profiles, subscriptions, accountClaims, providerOwners, providerSnapshots,
    time: (value: number) => { clock = value; },
    failProjection: (value: boolean) => { failProjection = value; },
    ownerWrites: () => ownerWrites,
  };
}

test("verified guest can claim before the webhook and replays preserve ownership/timestamps", async () => {
  const h = harness();
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed" });
  const first = h.purchases.get("sub_one")!;
  assert.equal(first.ownership.kind, "claimed");
  assert.equal(h.profiles.get(actor.uid)?.memberType, "monthly");
  assert.equal(h.providerOwners.get("sub_one"), actor.uid);
  h.time(3000);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "already_claimed" });
  assert.equal(h.purchases.get("sub_one")!.createdAtMs, first.createdAtMs);
  assert.deepEqual(h.purchases.get("sub_one")!.ownership, first.ownership);
  assert.equal(h.ownerWrites(), 1);
});

test("guest webhook before claim stores only a private unclaimed purchase", async () => {
  const h = harness();
  assert.deepEqual(await synchronizeRecurringMembership(snapshot(), undefined, h.effects), { kind: "synchronized" });
  assert.equal(h.purchases.get("sub_one")?.ownership.kind, "unclaimed");
  assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
  assert.equal(h.subscriptions.size, 0);
  assert.equal(h.ownerWrites(), 0);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed" });
});

test("verification, same-email ownership, and profile readiness are explicit outcomes", async () => {
  const h = harness();
  assert.deepEqual(await claimGuestMembership("cs_test_one", { ...actor, emailVerified: false }, h.effects), { kind: "email_verification_required" });
  assert.deepEqual(await claimGuestMembership("cs_test_one", { ...actor, email: null }, h.effects), { kind: "email_verification_required" });
  assert.deepEqual(await claimGuestMembership("cs_test_one", { ...actor, email: "someone@example.com" }, h.effects), { kind: "email_mismatch" });
  assert.equal(h.purchases.size, 0);
  h.profiles.delete(actor.uid);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "profile_pending" });
  h.profiles.set(actor.uid, {});
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "profile_pending" });
  h.profiles.set(actor.uid, { memberType: "free" });
  assert.deepEqual(await claimGuestMembership("cs_test_one", { ...actor, email: "PAYER@example.com" }, h.effects), { kind: "claimed" });
  assert.deepEqual(await claimGuestMembership("cs_test_one", { ...actor, uid: "accountB" }, h.effects), { kind: "claimed_elsewhere" });
});

test("pending, inactive, missing, and legacy checkout links never grant guest membership", async () => {
  for (const [changes, kind] of [
    [{ paymentState: "pending" as const, paidThroughMs: 0 }, "payment_pending"],
    [{ paymentState: "failed" as const, paidThroughMs: 0 }, "payment_inactive"],
    [{ paidThroughMs: 1500 }, "payment_inactive"],
    [{ source: "legacy" as const }, "not_found"],
  ] as const) {
    const h = harness(snapshot(changes));
    assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind });
    assert.equal(h.ownerWrites(), 0);
  }
  assert.deepEqual(await claimGuestMembership("cs_test_missing", actor, harness().effects), { kind: "not_found" });
});

test("existing lifetime or different recurring membership prevents an overlapping claim", async () => {
  for (const profile of [{ memberType: "lifeTime" as const }, { memberType: "yearly" as const, lastSubscriptionId: "sub_other" }]) {
    const h = harness();
    h.profiles.set(actor.uid, profile);
    assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "existing_membership" });
    assert.equal(h.ownerWrites(), 0);
  }
  const h = harness();
  h.subscriptions.set(actor.uid, [{ id: "sub_other", status: "active", currentPeriodEndMs: 10000 }]);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "existing_membership" });
});

test("concurrent claims for one purchase have at most one owner", async () => {
  const h = harness();
  h.profiles.set("accountB", { memberType: "free" });
  const results = await Promise.all([
    claimGuestMembership("cs_test_one", actor, h.effects),
    claimGuestMembership("cs_test_one", { ...actor, uid: "accountB" }, h.effects),
  ]);
  assert.deepEqual(results.map((result) => result.kind).sort(), ["claimed", "claimed_elsewhere"]);
  assert.equal(h.ownerWrites(), 1);
});

test("expired benefits do not permit overlapping subscriptions while the old billing lifecycle remains open", async () => {
  for (const status of ["active", "past_due", "unpaid", "paused", "trialing", "incomplete"] as const) {
    const h = harness();
    h.subscriptions.set(actor.uid, [{ id: "sub_other", status, currentPeriodEndMs: 1000 }]);
    assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "existing_membership" });
    assert.equal(h.ownerWrites(), 0);
  }
  const h = harness();
  h.subscriptions.set(actor.uid, [{ id: "sub_other", status: "canceled", currentPeriodEndMs: 1000 }]);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed" });
});

test("concurrent different purchases cannot both reserve the same free account", async () => {
  const h = harness();
  h.providerSnapshots.set("cs_test_two", snapshot({ sessionId: "cs_test_two", subscriptionId: "sub_two", customerId: "cus_two" }));
  const results = await Promise.all([
    claimGuestMembership("cs_test_one", actor, h.effects),
    claimGuestMembership("cs_test_two", actor, h.effects),
  ]);
  assert.equal(results.filter((result) => result.kind === "claimed").length, 1);
  assert.equal(h.ownerWrites(), 1);
});

test("partial metadata and final transaction failures retry the reserved owner safely", async () => {
  const h = harness();
  const attach = h.effects.provider.attachOwner;
  h.effects.provider.attachOwner = async () => { throw new Error("Injected Stripe outage"); };
  await assert.rejects(claimGuestMembership("cs_test_one", actor, h.effects), /Stripe outage/);
  assert.equal(h.purchases.get("sub_one")?.ownership.kind, "reserved");
  h.effects.provider.attachOwner = attach;
  h.failProjection(true);
  await assert.rejects(claimGuestMembership("cs_test_one", actor, h.effects), /transaction failure/);
  assert.equal(h.providerOwners.get("sub_one"), actor.uid);
  assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
  h.failProjection(false);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed" });
  assert.equal(h.ownerWrites(), 1);
});

test("current Stripe ownership conflicts never assign membership", async () => {
  const h = harness();
  h.providerOwners.set("sub_one", "anotherAccount");
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed_elsewhere" });
  assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
});

test("cancellation/expiry during ownership attachment is rechecked before activation", async () => {
  const h = harness();
  const attach = h.effects.provider.attachOwner;
  h.effects.provider.attachOwner = async (id, uid) => {
    const result = await attach(id, uid);
    h.time(11000);
    h.providerSnapshots.set("cs_test_one", snapshot({ subscriptionStatus: "canceled", endedAtMs: 10000, canceledAtMs: 10000 }));
    return result;
  };
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "payment_inactive" });
  assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
});

test("renewal before claim and cancellation after claim use the same paid-through projection", async () => {
  const h = harness();
  await synchronizeRecurringMembership(snapshot(), undefined, h.effects);
  h.time(11000);
  const renewed = snapshot({ currentPeriodStartMs: 10000, currentPeriodEndMs: 20000, paidThroughMs: 20000, providerObservedAtMs: 11000 });
  h.providerSnapshots.set("cs_test_one", renewed);
  await synchronizeRecurringMembership(renewed, undefined, h.effects);
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed" });
  const canceled = { ...renewed, subscriptionStatus: "canceled" as const, canceledAtMs: 12000, endedAtMs: 12000, providerObservedAtMs: 12000 };
  h.time(12000);
  h.providerSnapshots.set("cs_test_one", canceled);
  await synchronizeRecurringMembership(canceled, undefined, h.effects);
  assert.equal(h.profiles.get(actor.uid)?.memberType, "monthly");
  h.time(20000);
  await synchronizeRecurringMembership({ ...canceled, providerObservedAtMs: 20000 }, undefined, h.effects);
  assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "payment_inactive" });
});

test("failed renewal retains an already-paid period then expires exactly at its boundary", async () => {
  const h = harness();
  await claimGuestMembership("cs_test_one", actor, h.effects);
  h.time(5000);
  const failed = snapshot({ subscriptionStatus: "past_due", paidThroughMs: 0, providerObservedAtMs: 5000 });
  h.providerSnapshots.set("cs_test_one", failed);
  await synchronizeRecurringMembership(failed, undefined, h.effects);
  assert.equal(h.profiles.get(actor.uid)?.memberType, "monthly");
  assert.equal(h.purchases.get("sub_one")?.snapshot.paidThroughMs, 10000);
  h.time(10000);
  await synchronizeRecurringMembership({ ...failed, providerObservedAtMs: 10000 }, undefined, h.effects);
  assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
});

test("legacy monthly and yearly completion share the activation policy independently of payment amounts", async () => {
  for (const plan of ["monthly", "yearly"] as const) {
    const value = snapshot({ source: "legacy", plan, priceId: `price_${plan}` });
    const h = harness(value);
    assert.deepEqual(await synchronizeRecurringMembership(value, actor.uid, h.effects), { kind: "claimed" });
    assert.equal(h.profiles.get(actor.uid)?.memberType, plan);
    assert.equal(h.providerOwners.get("sub_one"), actor.uid);
  }
});

test("first-seen legacy failed renewal or expired cancellation adopts ownership and revokes stale access", async () => {
  for (const plan of ["monthly", "yearly"] as const) {
    for (const status of ["past_due", "canceled"] as const) {
      const value = snapshot({ source: "legacy", plan, priceId: `price_${plan}`, subscriptionStatus: status, paidThroughMs: 1000 });
      const h = harness(value);
      h.profiles.set(actor.uid, { memberType: plan, lastSubscriptionId: "sub_one" });
      h.subscriptions.set(actor.uid, [{ id: "sub_one", status: "active", currentPeriodEndMs: 10000 }]);
      assert.deepEqual(await synchronizeRecurringMembership(value, actor.uid, h.effects), { kind: "payment_inactive" });
      assert.equal(h.profiles.get(actor.uid)?.memberType, "free");
      assert.equal(h.subscriptions.get(actor.uid)?.[0].currentPeriodEndMs, 1000);
    }
  }
});

test("stale observations/events cannot restore canceled or expired purchase state", () => {
  const initial = reconcileMembershipPurchase(null, snapshot(), 2000);
  const canceled = reconcileMembershipPurchase(initial, snapshot({ subscriptionStatus: "canceled", providerObservedAtMs: 3000, eventId: "evt_new", eventCreatedMs: 3000 }), 3000);
  const stale = reconcileMembershipPurchase(canceled, snapshot({ providerObservedAtMs: 2500, eventId: "evt_old", eventCreatedMs: 2000 }), 4000);
  assert.equal(stale.snapshot.subscriptionStatus, "canceled");
  assert.throws(() => reconcileMembershipPurchase(canceled, snapshot({ providerObservedAtMs: 4000 }), 4000), /cannot become active/);
});

test("private IDs, payer email and internal state cannot leak through the subscription projection", () => {
  const view = createMembershipSubscriptionView(snapshot());
  assert.deepEqual(Object.keys(view).sort(), ["id", "status", "startDate", "endAt", "canceledAt", "currentPeriodStart", "currentPeriodEnd", "entitlementPolicy"].sort());
  assert.equal(JSON.stringify(view).includes("payer@example.com"), false);
  assert.equal(JSON.stringify(view).includes("cus_one"), false);
  assert.equal(JSON.stringify(view).includes("cs_test_one"), false);
  assert.equal(view.entitlementPolicy, "paid_period_v1");
});

test("immutable identities, malformed state and backwards timestamps fail immediately", () => {
  const current = reconcileMembershipPurchase(null, snapshot(), 2000);
  for (const change of [{ sessionId: "cs_test_other" }, { customerId: "cus_other" }, { payerEmail: "other@example.com" }, { priceId: "price_other" }, { subscriptionId: "sub_other" }, { startedAtMs: 500 }]) {
    assert.throws(() => reconcileMembershipPurchase(current, snapshot(change), 3000), /changed/);
  }
  assert.throws(() => reconcileMembershipPurchase(current, snapshot(), 1999), /future|backwards/);
  assert.throws(() => MembershipSnapshotSchema.parse({ ...snapshot(), paidThroughMs: 20000 }));
  assert.throws(() => MembershipSnapshotSchema.parse({ ...snapshot(), endedAtMs: 500 }));
  assert.throws(() => MembershipSnapshotSchema.parse({ ...snapshot(), canceledAtMs: 500 }));
  assert.throws(() => MembershipPurchaseSchema.parse({ ...current, updatedAtMs: 1000 }));
});

test("superseded terminal reservations reconcile without revoking the account's newer membership", () => {
  const old = reconcileMembershipPurchase(null, snapshot(), 2000);
  const purchase = MembershipPurchaseSchema.parse({ ...old, ownership: { kind: "reserved", uid: actor.uid, reservedAtMs: 2000 } });
  const decision = activateReservedMembership(snapshot({ subscriptionStatus: "canceled", providerObservedAtMs: 11000 }), actor.uid, {
    purchase,
    profile: { memberType: "monthly", lastSubscriptionId: "sub_new" },
    subscriptions: [{ id: "sub_new", status: "active", currentPeriodEndMs: 20000 }],
    accountClaim: { uid: actor.uid, subscriptionId: "sub_new", createdAtMs: 2000, updatedAtMs: 11000 },
    accountPurchase: null,
  }, 11000);
  assert.equal(decision.kind, "payment_inactive");
  assert.equal(decision.projection?.grant, "unchanged");
});

test("diagnostic failures do not change an otherwise successful claim", async () => {
  const h = harness();
  h.effects.checkpoint = () => { throw new Error("Logging unavailable"); };
  assert.deepEqual(await claimGuestMembership("cs_test_one", actor, h.effects), { kind: "claimed" });
});
