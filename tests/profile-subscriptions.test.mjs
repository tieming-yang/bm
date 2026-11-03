import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";
import { hasOpenRecurringBilling } from "../src/lib/subscriptions/billing.ts";

function loadProfile(docs) {
  return loadSourceModule("src/models/profiles.ts", {
    "@/utils/constants": {},
    "@/lib/firebase/firebase": { db: {} },
    "@/lib/policy": { Role: {}, Policy: {} },
    "firebase/firestore": {
      doc: (_, collection, id) => ({ collection, id }),
      collection: (parent, name) => ({ parent, name }),
      getDocs: async () => ({ docs }),
    },
  }).default;
}

test("legacy subscription documents use their canonical Firestore ID when the stored field is absent", async () => {
  const profile = loadProfile([{ id: "sub_current", data: () => ({ status: "past_due", currentPeriodEnd: 1 }) }]);
  const subscriptions = await profile.getSubscriptions("account-owner");
  assert.deepEqual(subscriptions, [{ id: "sub_current", status: "past_due", currentPeriodEnd: 1 }]);
  assert.equal(hasOpenRecurringBilling({ memberType: "free", lastSubscriptionId: "sub_current", subscriptions }), true);
});

test("matching subscription identifiers preserve existing data", async () => {
  const data = { id: "sub_current", status: "canceled", currentPeriodEnd: 1 };
  const profile = loadProfile([{ id: "sub_current", data: () => data }]);
  assert.deepEqual(await profile.getSubscriptions("account-owner"), [data]);
});

test("conflicting subscription identifiers cannot silently select another billing record", async () => {
  for (const id of ["sub_other", null, ""]) {
    const profile = loadProfile([{ id: "sub_current", data: () => ({ id, status: "active" }) }]);
    await assert.rejects(profile.getSubscriptions("account-owner"), /differs from its document path/);
  }
});
