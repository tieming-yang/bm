import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";
import { readLegacySessionOwner } from "../src/lib/membership/provider.ts";
import { MembershipSubscriptionIdSchema } from "../src/lib/membership/domain.ts";

function setup({ source = "guest", outcome = "synchronized", snapshotKind = "snapshot", paymentState = "paid", signatureFailure = false } = {}) {
  const calls = { sessions: [], subscriptions: [], sync: [], receipts: [], writes: [], verified: 0 };
  let event;
  const snapshot = { source, sessionId: "cs_test_one", subscriptionId: "sub_one", paymentState };
  const snapshotResult = snapshotKind === "snapshot" ? { kind: "snapshot", snapshot } : { kind: snapshotKind };
  const effects = { provider: {
    readSessionSnapshot: async (...args) => { calls.sessions.push(args); return snapshotResult; },
    readSubscriptionRouting: async () => ({ source, ...(source === "legacy" ? { ownerUid: "accountA" } : {}) }),
    readSubscriptionSnapshot: async (...args) => { calls.subscriptions.push(args); return snapshotResult; },
  } };
  const ref = (path) => ({
    id: path.split("/").at(-1),
    collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }),
    set: async (data, options) => { calls.writes.push({ path, data, options }); },
  });
  const route = loadSourceModule("src/app/api/webhook/stripe/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/stripe": { STRIPE_WEBHOOK_SECRET: "fixture-secret", stripe: { webhooks: { constructEvent: (body, signature, secret) => {
      calls.verified++;
      assert.equal(body, "signed-body");
      assert.equal(signature, "fixture-signature");
      assert.equal(secret, "fixture-secret");
      if (signatureFailure) throw new Error("secret-provider-error");
      return event;
    } } } },
    "@/lib/firebase/firebase-admin": { db: { doc: ref } },
    "firebase-admin/firestore": { FieldValue: { serverTimestamp: () => "server-timestamp" } },
    "@/models/profiles": { AccountType: { Organization: "organization" }, MemberType: { LiftTime: "lifeTime" } },
    "@/lib/membership/runtime": { createMembershipEffects: () => effects },
    "@/lib/membership/provider": { readLegacySessionOwner },
    "@/lib/membership/domain": { MembershipSubscriptionIdSchema },
    "@/lib/membership/workflow": { synchronizeRecurringMembership: async (...args) => { calls.sync.push(args); return { kind: outcome }; } },
    "@/lib/membership/legacy-receipt": { recordLegacyRecurringReceipt: async (...args) => { calls.receipts.push(args); return "written"; } },
  });
  return { calls, post: async (type, object) => {
    event = { id: "evt_one", type, created: 10, data: { object } };
    return route.POST(new Request("https://beyond-media.art/api/webhook/stripe", {
      method: "POST", headers: { "stripe-signature": "fixture-signature" }, body: "signed-body",
    }));
  } };
}

const guestSession = { object: "checkout.session", id: "cs_test_one", mode: "subscription", metadata: { membershipPurpose: "guest_membership_v1" } };
const legacySession = { ...guestSession, metadata: { uid: "accountA", email: "payer@example.com", priceId: "price_monthly" } };

test("signature verification happens before any membership or Firestore effects", async (t) => {
  t.mock.method(console, "log", () => {});
  const h = setup({ signatureFailure: true });
  const response = await h.post("checkout.session.completed", guestSession);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid Stripe signature" });
  assert.equal(h.calls.verified, 1);
  assert.equal(h.calls.sessions.length, 0);
  assert.equal(h.calls.writes.length, 0);
});

test("guest completion and asynchronous payment events never require legacy UID/email", async (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "info", () => {});
  for (const type of ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"]) {
    const h = setup();
    assert.equal((await h.post(type, guestSession)).status, 200);
    assert.equal(h.calls.sync.length, 1);
    assert.equal(h.calls.sync[0][1], undefined);
    assert.equal(h.calls.receipts.length, 0);
    assert.equal(h.calls.writes.length, 0);
    assert.deepEqual(h.calls.sessions[0], ["cs_test_one", { id: "evt_one", createdMs: 10000 }]);
  }
});

test("legacy recurring completion delegates activation once and then preserves the receipt", async (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "info", () => {});
  for (const type of ["checkout.session.completed", "checkout.session.async_payment_succeeded"]) {
    const h = setup({ source: "legacy", outcome: "claimed" });
    assert.equal((await h.post(type, legacySession)).status, 200);
    assert.equal(h.calls.sync[0][1], "accountA");
    assert.equal(h.calls.receipts[0][2], "accountA");
    assert.equal(h.calls.writes.length, 0, "Route must not retain a second recurring grant writer");
  }
});

test("both invoice outcomes and subscription changes reconcile current provider state before or after claim", async (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "info", () => {});
  for (const source of ["guest", "legacy"]) {
    for (const type of ["invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"]) {
      const h = setup({ source, outcome: "already_claimed" });
      const object = type.startsWith("invoice.")
        ? { object: "invoice", parent: { type: "subscription_details", subscription_details: { subscription: "sub_one" } } }
        : { object: "subscription", id: "sub_one" };
      assert.equal((await h.post(type, object)).status, 200);
      assert.deepEqual(h.calls.subscriptions[0], ["sub_one", { id: "evt_one", createdMs: 10000 }]);
      assert.equal(h.calls.sync[0][1], source === "legacy" ? "accountA" : undefined);
    }
  }
});

test("unfinished paid activation returns retryable webhook failure rather than losing the event", async (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  for (const outcome of ["profile_pending", "payment_pending", "not_found"]) {
    const h = setup({ source: "legacy", outcome });
    const response = await h.post("checkout.session.completed", legacySession);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { received: false, error: "Unable to process Stripe event" });
    assert.equal(h.calls.receipts.length, 0);
  }
  const unpaid = setup({ source: "legacy", outcome: "payment_pending", paymentState: "pending" });
  assert.equal((await unpaid.post("checkout.session.completed", legacySession)).status, 200);
});

test("legacy lifetime and organization one-time checkout behavior remains unchanged", async (t) => {
  t.mock.method(console, "log", () => {});
  for (const amount of [77700, 388850, 777700]) {
    const h = setup();
    const response = await h.post("checkout.session.completed", {
      object: "checkout.session", id: "cs_test_lifetime", mode: "payment", metadata: { uid: "accountA", email: "payer@example.com" },
      customer: "cus_one", payment_intent: "pi_one", payment_status: "paid", amount_total: amount, currency: "usd",
      customer_details: { name: "Payer", email: "payer@example.com" },
    });
    assert.equal(response.status, 200);
    const profile = h.calls.writes.find((write) => write.path === "profiles/accountA");
    assert.equal(profile.data.memberType, "lifeTime");
    assert.equal(profile.data.accountType, amount === 77700 ? undefined : "organization");
    assert.equal(h.calls.writes.some((write) => write.path === "profiles/accountA/transactions/cs_test_lifetime"), true);
    assert.equal(h.calls.sync.length, 0);
  }
});

test("unrelated invoices are ignored and conflicting subscription references fail without writes", async (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  const h = setup();
  assert.equal((await h.post("invoice.paid", { object: "invoice", parent: null })).status, 200);
  assert.equal(h.calls.subscriptions.length, 0);
  assert.equal((await h.post("invoice.paid", {
    object: "invoice", parent: { type: "subscription_details", subscription_details: { subscription: "sub_one" } }, subscription: "sub_two",
  })).status, 500);
  assert.equal(h.calls.subscriptions.length, 0);
});
