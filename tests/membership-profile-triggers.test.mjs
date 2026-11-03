import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadSourceModule } from "./helpers/source-module.mjs";

const profilePath = fileURLToPath(new URL("../src/lib/firebase/functions/src/profile.ts", import.meta.url));
const cronPath = fileURLToPath(new URL("../src/lib/firebase/functions/src/cron.ts", import.meta.url));
const profileRef = "profiles/member";
const oldSubRef = `${profileRef}/subscriptions/sub_old`;
const newSubRef = `${profileRef}/subscriptions/sub_new`;
const commitTime = { serverTimestamp: true };
const initialized = {
  memberType: "monthly", accountType: "personal", role: "user", savedChildren: [],
  isEbVolunteer: null, memberDetails: { name: "Member" }, createdAt: 10, updatedAt: 20,
  lastSubscriptionId: "sub_old",
};

// An optimistic transaction fake retries when a read document changes before commit.
function setup(initial, beforeCommit) {
  const documents = new Map(Object.entries(initial));
  const versions = new Map();
  const writes = [];
  let transactionCount = 0;
  const put = (path, data) => {
    if (data === undefined) documents.delete(path); else documents.set(path, data);
    versions.set(path, (versions.get(path) ?? 0) + 1);
  };
  const ref = (path) => ({ path, collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }) });
  const snapshot = (path) => ({
    ref: ref(path), exists: documents.has(path), createTime: 10,
    data: () => documents.get(path), get: (key) => documents.get(path)?.[key],
  });
  const db = {
    collection: () => ({ get: async () => ({ docs: [snapshot(profileRef)] }) }),
    runTransaction: async (action) => {
      for (;;) {
        transactionCount++;
        const reads = new Map();
        const pending = [];
        await action({
          get: async (reference) => {
            reads.set(reference.path, versions.get(reference.path) ?? 0);
            return snapshot(reference.path);
          },
          set: (reference, data, options) => pending.push({ path: reference.path, data, options }),
        });
        const hook = beforeCommit;
        beforeCommit = undefined;
        if (hook) hook({ put, documents });
        if ([...reads].some(([path, version]) => version !== (versions.get(path) ?? 0))) continue;
        for (const write of pending) {
          writes.push(write);
          put(write.path, write.options?.merge ? { ...documents.get(write.path), ...write.data } : write.data);
        }
        return;
      }
    },
  };
  const imports = {
    "firebase-admin/app": { getApps: () => [{}], initializeApp: () => ({}) },
    "firebase-admin/auth": { getAuth: () => ({}) },
    "firebase-admin/firestore": { getFirestore: () => db, FieldValue: { serverTimestamp: () => commitTime }, Timestamp: { now: () => 100 } },
    "firebase-functions/v2/firestore": { onDocumentCreated: (_path, fn) => fn, onDocumentDeleted: (_path, fn) => fn },
    "firebase-functions/v2/scheduler": { onSchedule: (_options, fn) => fn },
    "firebase-functions/logger": { info() {} },
  };
  return {
    documents, writes, count: () => transactionCount,
    create: () => loadSourceModule(profilePath, imports).onProfileCreated({ data: { ref: ref(profileRef), data: () => ({}) } }),
    expire: () => loadSourceModule(cronPath, imports).checkSubscriptionExpiry(),
  };
}

test("delayed and repeated profile initialization preserves activated membership and timestamps", async () => {
  const state = setup({ [profileRef]: initialized });
  await state.create();
  await state.create();
  assert.deepEqual(state.documents.get(profileRef), initialized);
  assert.equal(state.writes.length, 0);
});

test("initialization retries a concurrent activation without resetting paid access", async () => {
  const state = setup({ [profileRef]: { createdAt: 5 } }, ({ put }) => put(profileRef, initialized));
  await state.create();
  assert.equal(state.count(), 2);
  assert.deepEqual(state.documents.get(profileRef), initialized);
  assert.equal(state.writes.length, 0);
});

test("initialization supplies missing defaults once and never recreates a deleted profile", async () => {
  const state = setup({ [profileRef]: { createdAt: 5 } });
  await state.create();
  await state.create();
  assert.equal(state.documents.get(profileRef).memberType, "free");
  assert.equal(state.documents.get(profileRef).createdAt, 5);
  assert.equal(state.writes.length, 1);
  assert.deepEqual(state.writes[0].data.updatedAt, commitTime);
  const deleted = setup({});
  await deleted.create();
  assert.equal(deleted.writes.length, 0);
});

test("expiry downgrades canceled and elapsed recurring memberships exactly once", async () => {
  const state = setup({ [profileRef]: initialized, [oldSubRef]: { status: "canceled", currentPeriodEnd: 0 } });
  await state.expire();
  await state.expire();
  assert.equal(state.documents.get(profileRef).memberType, "free");
  assert.equal(state.documents.get(profileRef).createdAt, 10);
  assert.equal(state.writes.length, 1);
  assert.deepEqual(state.writes[0].data.updatedAt, commitTime);
});

test("expiry rechecks the subscription pointer when a new claim wins the transaction", async () => {
  const state = setup({ [profileRef]: initialized, [oldSubRef]: { status: "canceled", currentPeriodEnd: 0 } }, ({ put }) => {
    put(profileRef, { ...initialized, lastSubscriptionId: "sub_new" });
    put(newSubRef, { status: "active", currentPeriodEnd: 9999999999 });
  });
  await state.expire();
  assert.equal(state.count(), 2);
  assert.equal(state.documents.get(profileRef).memberType, "monthly");
  assert.equal(state.documents.get(profileRef).lastSubscriptionId, "sub_new");
  assert.equal(state.writes.length, 0);
});

test("expiry retries a concurrent subscription renewal and leaves the renewed member active", async () => {
  const state = setup({ [profileRef]: initialized, [oldSubRef]: { status: "canceled", currentPeriodEnd: 0 } }, ({ put }) => {
    put(oldSubRef, { status: "active", currentPeriodEnd: 9999999999 });
  });
  await state.expire();
  assert.equal(state.count(), 2);
  assert.equal(state.writes.length, 0);
});

for (const memberType of ["free", "lifeTime"]) {
  test(`expiry preserves ${memberType} even when an old canceled subscription remains`, async () => {
    const state = setup({ [profileRef]: { ...initialized, memberType }, [oldSubRef]: { status: "canceled", currentPeriodEnd: 0 } });
    await state.expire();
    assert.equal(state.writes.length, 0);
  });
}

for (const subscription of [{ status: "active", currentPeriodEnd: 0 }, { status: "canceled", currentPeriodEnd: 9999999999 }]) {
  test(`expiry leaves ${subscription.status}/${subscription.currentPeriodEnd} access unchanged`, async () => {
    const state = setup({ [profileRef]: initialized, [oldSubRef]: subscription });
    await state.expire();
    assert.equal(state.writes.length, 0);
  });
}

for (const status of ["active", "past_due", "unpaid", "canceled"]) {
  test(`paid-period ${status} membership expires exactly at its paid-through boundary`, async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: 100000 });
    const state = setup({ [profileRef]: initialized, [oldSubRef]: { status, currentPeriodEnd: 100, entitlementPolicy: "paid_period_v1" } });
    await state.expire();
    assert.equal(state.documents.get(profileRef).memberType, "free");
    const stillPaid = setup({ [profileRef]: initialized, [oldSubRef]: { status, currentPeriodEnd: 101, entitlementPolicy: "paid_period_v1" } });
    await stillPaid.expire();
    assert.equal(stillPaid.writes.length, 0);
  });
}

test("expiry rejects an unknown paid-period policy", async () => {
  const state = setup({ [profileRef]: initialized, [oldSubRef]: { status: "active", currentPeriodEnd: 0, entitlementPolicy: "unknown" } });
  await assert.rejects(state.expire(), /Subscription has an invalid entitlement policy/);
  assert.equal(state.writes.length, 0);
});

for (const subscription of [{ status: "unknown", currentPeriodEnd: 0 }, { status: "canceled", currentPeriodEnd: "0" }, { status: "canceled", currentPeriodEnd: -1 }]) {
  test(`expiry rejects malformed persisted subscription ${JSON.stringify(subscription)}`, async () => {
    const state = setup({ [profileRef]: initialized, [oldSubRef]: subscription });
    await assert.rejects(state.expire(), /Subscription has an invalid/);
    assert.equal(state.writes.length, 0);
  });
}
