import assert from "node:assert/strict";
import test from "node:test";
import { MembershipStatusSchema } from "../membership/domain.ts";
import { hasOpenRecurringBilling } from "./billing.ts";

test("open billing is independent of expired paid access and free member type", () => {
  for (const status of MembershipStatusSchema.options) {
    assert.equal(hasOpenRecurringBilling({
      memberType: "free", lastSubscriptionId: "sub_current",
      subscriptions: [{ id: "sub_current", status, currentPeriodEnd: 1 }],
    }), status !== "canceled" && status !== "incomplete_expired");
  }
});

test("billing follows the current pointer rather than subscription history order", () => {
  const current = { id: "sub_current", status: "unpaid" };
  const previous = { id: "sub_previous", status: "canceled" };
  for (const subscriptions of [[current, previous], [previous, current]]) {
    assert.equal(hasOpenRecurringBilling({ lastSubscriptionId: current.id, subscriptions }), true);
    assert.equal(hasOpenRecurringBilling({ lastSubscriptionId: previous.id, subscriptions }), false);
  }
});

test("accounts without a current subscription do not acquire billing obligations", () => {
  assert.equal(hasOpenRecurringBilling(undefined), false);
  assert.equal(hasOpenRecurringBilling({}), false);
  assert.equal(hasOpenRecurringBilling({ memberType: "free", subscriptions: [] }), false);
});

test("malformed or missing canonical billing records cannot be treated as safe for another checkout", () => {
  for (const profile of [
    null,
    { lastSubscriptionId: "not-a-subscription" },
    { lastSubscriptionId: "sub_current", subscriptions: [] },
    { lastSubscriptionId: "sub_current", subscriptions: [{ id: "sub_other", status: "active" }] },
    { lastSubscriptionId: "sub_current", subscriptions: [{ id: "sub_current", status: "unknown" }] },
  ]) assert.throws(() => hasOpenRecurringBilling(profile));
});
