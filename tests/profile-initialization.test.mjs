import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";
import { loadSourceModule } from "./helpers/source-module.mjs";

const seed = { uid: "owner", displayName: "Member", email: "owner@example.test", photoURL: null };
function harness(initial) {
  let stored = initial;
  let currentUid = "owner";
  let reads = 0;
  const writes = [];
  let queue = Promise.resolve();
  const snapshot = () => ({ exists: () => stored !== undefined, data: () => stored });
  const Profile = loadSourceModule("src/models/profiles.ts", {
    "@/lib/firebase/firebase": { db: {}, auth: { get currentUser() { return currentUid ? { uid: currentUid } : null; } } },
    "@/lib/policy": { Role: {}, Policy: {} },
    "firebase/firestore": {
      Timestamp,
      doc: () => "profiles/owner", collection: () => "subscriptions", getDocs: async () => ({ docs: [] }), getDoc: async () => snapshot(),
      serverTimestamp: () => Timestamp.fromMillis(100),
      runTransaction: (_, work) => {
        const task = queue.then(() => work({
          get: async () => { reads++; return snapshot(); },
          set: (ref, data) => { assert.ok(reads > 0); writes.push({ ref, data }); stored = data; },
        }));
        queue = task.catch(() => {});
        return task;
      },
    },
  }).default;
  return { Profile, writes, stored: () => stored, user: (uid) => { currentUid = uid; } };
}

test("concurrent profile initialization converges without rewriting creation state", async () => {
  const h = harness();
  const results = await Promise.all([h.Profile.ensureInitialized(seed), h.Profile.ensureInitialized(seed)]);
  assert.deepEqual(results.map((result) => result.kind), ["created", "existing"]);
  assert.equal(h.writes.length, 1);
  assert.deepEqual(Object.keys(h.stored()).sort(), ["createdAt", "displayName", "email", "newsletterOptIn", "photoURL", "uid", "updatedAt"]);
});

test("retry preserves existing opt-outs paid access admin role and family data", async () => {
  const existing = { ...seed, newsletterOptIn: false, memberType: "lifeTime", role: "admin", savedChildren: [{ id: "child" }], createdAt: Timestamp.fromMillis(10), updatedAt: Timestamp.fromMillis(20) };
  const h = harness(existing);
  assert.equal((await h.Profile.ensureInitialized({ ...seed, displayName: "Changed" })).kind, "existing");
  assert.equal(h.writes.length, 0);
  assert.equal(h.stored(), existing);
});

for (const changed of [{ uid: "someone-else" }, { createdAt: null }, { updatedAt: Timestamp.fromMillis(1) }]) {
  test(`invalid existing profile seed becomes a conflict: ${Object.keys(changed)[0]}`, async () => {
    const h = harness({ ...seed, createdAt: Timestamp.fromMillis(10), updatedAt: Timestamp.fromMillis(20), ...changed });
    await assert.rejects(h.Profile.ensureInitialized(seed), (error) => error.code === "profile/setup-conflict");
    await assert.rejects(h.Profile.read("owner"), (error) => error.code === "profile/setup-conflict");
    assert.equal(h.writes.length, 0);
  });
}

test("malformed extra creation fields and a changed active owner cannot write", async () => {
  const h = harness();
  await assert.rejects(h.Profile.ensureInitialized({ ...seed, role: "admin" }));
  h.user("other");
  await assert.rejects(h.Profile.ensureInitialized(seed), /authenticated owner/);
  assert.equal(h.writes.length, 0);
});

test("base profile reads allow asynchronous defaults to remain absent", async () => {
  const h = harness({ ...seed, createdAt: Timestamp.fromMillis(10), updatedAt: Timestamp.fromMillis(20) });
  assert.equal((await h.Profile.read("owner")).kind, "found");
  assert.equal(h.writes.length, 0);
});
