import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";
import * as contracts from "../src/lib/membership/contracts.ts";
import { MembershipSnapshotSchema } from "../src/lib/membership/domain.ts";
import { MembershipProviderConfigSchema } from "../src/lib/membership/provider.ts";
import { claimGuestMembership } from "../src/lib/membership/workflow.ts";

const checkoutInput = { attemptId: "62096aa7-f204-42dd-b92d-c4c9d6cd210c", locale: "en" };
const sessionId = "cs_test_fixture";
const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_fixture";
const verifiedActor = { uid: "account-owner", email: "verified@example.com", emailVerified: true, disabled: false };

function request(route, body, authorization) {
  return new Request(`https://beyond-media.art/api/membership/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function setup({
  decoded = { uid: verifiedActor.uid, email: "stale@example.com", email_verified: false },
  actor = verifiedActor,
  verifyFailure,
  lookupFailure,
  effectFailure,
  checkout = async () => ({ kind: "checkout", url: checkoutUrl }),
  claim = async () => ({ kind: "claimed" }),
  effects: suppliedEffects,
} = {}) {
  const calls = { verify: [], lookup: [], checkout: [], claim: [], compose: 0 };
  const effects = suppliedEffects ?? { provider: { createGuestCheckout: async (input) => {
    calls.checkout.push(input);
    return checkout(input);
  } } };
  const imports = {
    "@/lib/firebase/firebase-admin": { auth: {
      verifyIdToken: async (...args) => {
        calls.verify.push(args);
        if (verifyFailure) throw verifyFailure;
        return decoded;
      },
      getUser: async (uid) => {
        calls.lookup.push(uid);
        if (lookupFailure) throw lookupFailure;
        return actor;
      },
    } },
    "@/lib/membership/contracts": contracts,
    "@/lib/membership/runtime": { createMembershipEffects: () => {
      calls.compose++;
      if (effectFailure) throw effectFailure;
      return effects;
    } },
    "@/lib/membership/workflow": { claimGuestMembership: async (...args) => {
      calls.claim.push(args);
      return claim(...args);
    } },
  };
  return {
    calls,
    checkoutPost: loadSourceModule("src/app/api/membership/checkout/route.ts", imports).POST,
    claimPost: loadSourceModule("src/app/api/membership/claim/route.ts", imports).POST,
  };
}

async function expectResponse(response, status, body) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), body);
}

test("guest checkout accepts only the fixed attempt payload and forwards the same retry unchanged", async () => {
  const { checkoutPost, calls } = setup();
  for (let retry = 0; retry < 2; retry++) {
    await expectResponse(await checkoutPost(request("checkout", checkoutInput)), 200, { kind: "checkout", url: checkoutUrl });
  }
  assert.deepEqual(calls.checkout, [checkoutInput, checkoutInput]);
  assert.deepEqual(calls.verify, []);
  assert.deepEqual(calls.lookup, []);
  assert.deepEqual(calls.claim, []);
});

test("checkout rejects malformed JSON, unsupported locales, and caller pricing or identity before effects", async () => {
  const { checkoutPost, calls } = setup();
  for (const body of [
    "{", null, [], {}, { ...checkoutInput, attemptId: "not-a-uuid" },
    { ...checkoutInput, locale: "zh-CN" }, { ...checkoutInput, priceId: "price_arbitrary" },
    { ...checkoutInput, uid: "another-account" }, { ...checkoutInput, email: "payer@example.com" },
    { ...checkoutInput, successUrl: "https://untrusted.example" },
  ]) {
    await expectResponse(await checkoutPost(request("checkout", body)), 400, { kind: "invalid_request" });
  }
  assert.equal(calls.compose, 0);
  assert.deepEqual(calls.checkout, []);
});

test("checkout provider or composition failures return a retryable response without sensitive error details", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (...args) => logs.push(args));
  const secret = "payer-private@example.com sk_live_private cs_live_private";
  for (const options of [
    { checkout: async () => { throw new Error(secret); } },
    { effectFailure: new Error(secret) },
    { checkout: async () => ({ kind: "checkout", url: "https://untrusted.example/pay", email: secret }) },
    { checkout: async () => ({ kind: "checkout", url: checkoutUrl, customerId: "cus_private" }) },
  ]) {
    await expectResponse(await setup(options).checkoutPost(request("checkout", checkoutInput)), 503, { kind: "retryable_failure" });
  }
  assert.equal(logs.length, 4);
  assert.doesNotMatch(JSON.stringify(logs), /payer-private|sk_live_private|cs_live_private|cus_private|untrusted/);
});

test("claim requires a single bearer token before parsing or looking up a purchase", async () => {
  const { claimPost, calls } = setup();
  for (const authorization of [undefined, "Basic credentials", "Bearer", "Bearer token extra"]) {
    await expectResponse(await claimPost(request("claim", { sessionId }, authorization)), 401, { kind: "authentication_required" });
  }
  assert.deepEqual(calls.verify, []);
  assert.deepEqual(calls.lookup, []);
  assert.equal(calls.compose, 0);
});

test("claim rejects malformed JSON, session identifiers, and client-supplied ownership or verification", async () => {
  const { claimPost, calls } = setup();
  for (const body of [
    "{", null, [], {}, { sessionId: "not-a-session" }, { sessionId: [sessionId] },
    { sessionId, uid: "another-account" }, { sessionId, email: "payer@example.com" },
    { sessionId, emailVerified: true }, { sessionId, priceId: "price_arbitrary" },
  ]) {
    await expectResponse(await claimPost(request("claim", body, "Bearer valid-token")), 400, { kind: "invalid_request" });
  }
  assert.deepEqual(calls.verify, []);
  assert.deepEqual(calls.lookup, []);
  assert.equal(calls.compose, 0);
});

test("invalid, expired, revoked, disabled, or deleted authentication has a concrete 401 recovery", async () => {
  for (const code of ["auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled", "auth/user-not-found"]) {
    const { claimPost, calls } = setup({ verifyFailure: Object.assign(new Error("Private auth details"), { code }) });
    await expectResponse(await claimPost(request("claim", { sessionId }, "Bearer rejected-token")), 401, { kind: "authentication_required" });
    assert.deepEqual(calls.verify, [["rejected-token", true]]);
    assert.deepEqual(calls.lookup, []);
    assert.equal(calls.compose, 0);
  }
  const deleted = setup({ lookupFailure: Object.assign(new Error("Private account details"), { code: "auth/user-not-found" }) });
  await expectResponse(await deleted.claimPost(request("claim", { sessionId }, "Bearer valid-token")), 401, { kind: "authentication_required" });
  assert.equal(deleted.calls.compose, 0);
  const disabled = setup({ actor: { ...verifiedActor, disabled: true } });
  await expectResponse(await disabled.claimPost(request("claim", { sessionId }, "Bearer valid-token")), 401, { kind: "authentication_required" });
  assert.deepEqual(disabled.calls.lookup, [verifiedActor.uid]);
  assert.equal(disabled.calls.compose, 0);
});

test("fresh Firebase verification overrides stale token claims before any Stripe lookup", async () => {
  let providerReads = 0;
  const { claimPost, calls } = setup({
    decoded: { uid: verifiedActor.uid, email: "token-email@example.com", email_verified: true },
    actor: { ...verifiedActor, email: "new-email@example.com", emailVerified: false },
    claim: claimGuestMembership,
    effects: { provider: { readSessionSnapshot: async () => { providerReads++; throw new Error("Must verify first"); } } },
  });
  await expectResponse(await claimPost(request("claim", { sessionId }, "Bearer stale-token")), 200, { kind: "email_verification_required" });
  assert.deepEqual(calls.verify, [["stale-token", true]]);
  assert.deepEqual(calls.lookup, [verifiedActor.uid]);
  assert.deepEqual(calls.claim[0][1], { uid: verifiedActor.uid, email: "new-email@example.com", emailVerified: false });
  assert.equal(providerReads, 0);
});

test("a refreshed verified email is used even when the token still has an old unverified address", async () => {
  const { claimPost, calls } = setup();
  await expectResponse(await claimPost(request("claim", { sessionId }, "Bearer stale-token")), 200, { kind: "claimed" });
  assert.equal(calls.claim[0][0], sessionId);
  assert.deepEqual(calls.claim[0][1], { uid: verifiedActor.uid, email: verifiedActor.email, emailVerified: true });
  assert.deepEqual(Object.keys(calls.claim[0][1]).sort(), ["email", "emailVerified", "uid"]);
});

test("claim checks the checkout against the fresh account email and never exposes the payer email", async () => {
  let storeReads = 0;
  const payerEmail = "payer-private@example.com";
  const snapshot = MembershipSnapshotSchema.parse({
    sessionId, subscriptionId: "sub_fixture", customerId: "cus_fixture", priceId: "price_monthly",
    plan: "monthly", source: "guest", payerEmail, paymentState: "paid", subscriptionStatus: "active",
    startedAtMs: 1000, endedAtMs: null, canceledAtMs: null, currentPeriodStartMs: 1000,
    currentPeriodEndMs: 100_000, paidThroughMs: 100_000, providerObservedAtMs: 2000,
    eventId: null, eventCreatedMs: null,
  });
  const { claimPost } = setup({
    decoded: { uid: verifiedActor.uid, email: payerEmail, email_verified: true },
    actor: { ...verifiedActor, email: "new-verified@example.com" },
    claim: claimGuestMembership,
    effects: {
      provider: { readSessionSnapshot: async () => ({ kind: "snapshot", snapshot }) },
      store: { readPurchase: async () => { storeReads++; throw new Error("Mismatched email must not read ownership"); } },
    },
  });
  await expectResponse(await claimPost(request("claim", { sessionId }, "Bearer stale-token")), 200, { kind: "email_mismatch" });
  assert.equal(storeReads, 0);
});

test("all expected paid-user recovery outcomes retain their public body and HTTP 200", async () => {
  for (const kind of ["claimed", "already_claimed", "email_verification_required", "email_mismatch", "payment_pending", "payment_inactive", "existing_membership", "claimed_elsewhere", "profile_pending", "not_found"]) {
    const { claimPost } = setup({ claim: async () => ({ kind }) });
    await expectResponse(await claimPost(request("claim", { sessionId }, "Bearer valid-token")), 200, { kind });
  }
});

test("Firebase infrastructure and claim failures stay retryable without logging provider data or tokens", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (...args) => logs.push(args));
  const secret = "payer-private@example.com sk_live_private cs_live_private valid-private-token";
  const failure = Object.assign(new Error(secret), { code: "auth/internal-error" });
  for (const options of [
    { verifyFailure: failure }, { lookupFailure: failure }, { effectFailure: failure },
    { claim: async () => { throw failure; } },
    { claim: async () => ({ kind: "claimed", email: secret, subscriptionId: "sub_private" }) },
  ]) {
    await expectResponse(await setup(options).claimPost(request("claim", { sessionId }, "Bearer valid-private-token")), 503, { kind: "retryable_failure" });
  }
  assert.equal(logs.length, 5);
  assert.doesNotMatch(JSON.stringify(logs), /payer-private|sk_live_private|cs_live_private|valid-private-token|sub_private/);
  assert.equal(logs[0][1].stage, "authentication");
  assert.equal(logs.at(-1)[1].stage, "claim");
});

test("runtime composition normalizes the existing trailing-slash production URL into a canonical origin", () => {
  const stripe = {};
  const store = {};
  const provider = {};
  const seen = [];
  const { createMembershipEffects } = loadSourceModule("src/lib/membership/runtime.ts", {
    "server-only": {},
    "@/lib/stripe": { stripe },
    "@/models/prices": { getMonthlyPriceId: () => "price_monthly", getYearlyPriceId: () => "price_yearly" },
    "@/models/config": { isProd: true, baseUrl: "https://beyond-media.art/" },
    "./provider.ts": { createMembershipProvider: (client, input, now) => {
      seen.push({ client, config: MembershipProviderConfigSchema.parse(input), now });
      return provider;
    } },
    "./store.ts": { membershipStore: store },
  });
  const effects = createMembershipEffects();
  assert.equal(effects.provider, provider);
  assert.equal(effects.store, store);
  assert.equal(seen[0].client, stripe);
  assert.deepEqual(seen[0].config, { monthlyPriceId: "price_monthly", yearlyPriceId: "price_yearly", livemode: true, baseUrl: "https://beyond-media.art" });
  assert.equal(seen[0].now, Date.now);
});
