import assert from "node:assert/strict";
import test from "node:test";
import { deriveLegacyMemberDetails, deriveLegacyRecurringReceipt, validateLegacyReceiptReplay } from "./legacy-receipt-policy.ts";
import type { MembershipSnapshot } from "./domain.ts";

const snapshot: MembershipSnapshot = {
  sessionId: "cs_test_paid", subscriptionId: "sub_owned", customerId: "cus_owner", priceId: "price_monthly",
  plan: "monthly", source: "legacy", payerEmail: "payer@example.com", paymentState: "paid", subscriptionStatus: "active",
  startedAtMs: 1000, endedAtMs: null, canceledAtMs: null,
  currentPeriodStartMs: 1000, currentPeriodEndMs: 100000, paidThroughMs: 100000,
  providerObservedAtMs: 2000, eventId: null, eventCreatedMs: null,
};

function session() {
  return {
    object: "checkout.session", id: "cs_test_paid", mode: "subscription", status: "complete",
    payment_status: "paid", customer: "cus_owner", subscription: "sub_owned", payment_intent: null,
    amount_total: 847, currency: "usd",
    metadata: { uid: "user-one", email: "account@example.com", priceId: "price_monthly", internalUnusedField: "must not be copied" },
    customer_details: { email: " Payer@Example.com ", name: "Example", phone: null, address: null },
  };
}

test("legacy monthly receipt uses verified owner, payer and price while retaining tax-inclusive amount", () => {
  const receipt = deriveLegacyRecurringReceipt(session(), snapshot, "user-one");
  assert.ok(receipt);
  assert.equal(receipt.transaction.amountTotal, 847);
  assert.deepEqual(receipt.transaction.metadata, { uid: "user-one", email: "payer@example.com", priceId: "price_monthly" });
  assert.equal(receipt.transaction.paymentIntentId, null);
  assert.equal(receipt.memberDetails.address.postalCode, null);
  assert.equal("postal_code" in receipt.memberDetails.address, false);
  assert.equal(JSON.stringify(receipt).includes("internalUnusedField"), false);
  assert.equal("memberType" in receipt.memberDetails, false);
});

test("legacy yearly and zero-total coupon receipts remain supported", () => {
  const annual = session();
  annual.metadata.priceId = "price_yearly";
  annual.payment_status = "no_payment_required";
  annual.amount_total = 0;
  const receipt = deriveLegacyRecurringReceipt(annual, { ...snapshot, priceId: "price_yearly", plan: "yearly" }, "user-one");
  assert.equal(receipt?.transaction.amountTotal, 0);
  assert.equal(receipt?.transaction.paymentStatus, "no_payment_required");
});

test("delayed unpaid events are ignored until a verified payment completion arrives", () => {
  assert.equal(deriveLegacyRecurringReceipt({ ...session(), payment_status: "unpaid" }, snapshot, "user-one"), null);
  assert.equal(deriveLegacyRecurringReceipt(session(), { ...snapshot, paymentState: "pending" }, "user-one"), null);
});

test("receipt derivation rejects guest flow, changed identifiers, owner, price and payer", () => {
  for (const invalid of [
    { ...session(), id: "cs_test_other" },
    { ...session(), customer: "cus_other" },
    { ...session(), subscription: "sub_other" },
    { ...session(), metadata: { ...session().metadata, uid: "user-two" } },
    { ...session(), metadata: { ...session().metadata, priceId: "price_other" } },
    { ...session(), metadata: { ...session().metadata, membershipPurpose: "guest_membership_v1" } },
    { ...session(), customer_details: { ...session().customer_details, email: "different@example.com" } },
    { ...session(), amount_total: -1 },
  ]) assert.throws(() => deriveLegacyRecurringReceipt(invalid, snapshot, "user-one"));
  assert.throws(() => deriveLegacyRecurringReceipt(session(), { ...snapshot, source: "guest" }, "user-one"));
});

test("replayed receipts preserve stable purchase fields and only advance unpaid payment status", () => {
  const receipt = deriveLegacyRecurringReceipt(session(), snapshot, "user-one")!;
  assert.doesNotThrow(() => validateLegacyReceiptReplay(receipt.transaction, receipt));
  assert.doesNotThrow(() => validateLegacyReceiptReplay({ ...receipt.transaction, paymentStatus: "unpaid" }, receipt));
  for (const existing of [
    { ...receipt.transaction, sessionId: "cs_test_other" },
    { ...receipt.transaction, paymentIntentId: "pi_other" },
    { ...receipt.transaction, customerId: "cus_other" },
    { ...receipt.transaction, amountTotal: 770 },
    { ...receipt.transaction, currency: "twd" },
    { ...receipt.transaction, metadata: { ...receipt.transaction.metadata, uid: "other" } },
    { ...receipt.transaction, metadata: { ...receipt.transaction.metadata, priceId: "price_other" } },
    { ...receipt.transaction, paymentStatus: "no_payment_required" },
  ]) assert.throws(() => validateLegacyReceiptReplay(existing, receipt));
});

test("contact updates preserve an existing validated emergency contact without mutating account state", () => {
  const receipt = deriveLegacyRecurringReceipt(session(), snapshot, "user-one")!;
  const emergency = { firstName: "Family", lastName: null, phoneNumber: "+123456789" };
  const result = deriveLegacyMemberDetails(receipt, { memberDetails: { emergencyContact: emergency }, memberType: "monthly" });
  assert.deepEqual(result.emergencyContact, emergency);
  assert.equal(result.name, "Example");
  assert.equal("memberType" in result, false);
  assert.deepEqual(deriveLegacyMemberDetails(receipt, {}).emergencyContact, { firstName: null, lastName: null, phoneNumber: null });
  assert.throws(() => deriveLegacyMemberDetails(receipt, { memberDetails: { emergencyContact: { phoneNumber: 123 } } }));
});
