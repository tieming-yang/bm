import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";

const { createAccountSetupCoordinator } = loadSourceModule("src/lib/account/setup.ts");
const principal = { uid: "owner", email: "owner@example.test", displayName: null, photoURL: null };
function harness() {
  let user = null;
  let attempts = 0;
  let failure = false;
  const seeds = [];
  const published = [];
  const profile = { uid: "owner", newsletterOptIn: false, memberType: "lifeTime" };
  const coordinator = createAccountSetupCoordinator({
    currentUser: () => user,
    initialize: async (seed) => { attempts++; seeds.push({ ...seed }); if (failure) throw new Error("Network unavailable"); return { kind: "created" }; },
    read: async () => ({ kind: "found", profile }),
    publish: (uid, result) => published.push({ uid, result }),
  });
  return { coordinator, seeds, published, profile, user: (next) => { user = next; }, failure: (next) => { failure = next; }, attempts: () => attempts };
}

test("interactive reservation prevents automatic recovery from discarding the typed name", async () => {
  const h = harness();
  let finish;
  const pending = h.coordinator.authenticate(() => new Promise((resolve) => { finish = resolve; }), "Typed signup name");
  h.user(principal);
  h.coordinator.observeSession(principal);
  h.coordinator.acceptRead(principal.uid, { kind: "missing" }, null);
  assert.equal(h.attempts(), 0);
  finish({ user: principal });
  assert.equal((await pending).kind, "ready");
  assert.equal(h.attempts(), 1);
  assert.equal(h.seeds[0].displayName, "Typed signup name");
  assert.deepEqual(Object.keys(h.seeds[0]).sort(), ["displayName", "email", "photoURL", "uid"]);
});

test("retry after partial signup initializes only the profile and retains its safe seed", async () => {
  const h = harness();
  h.failure(true);
  let authenticationCalls = 0;
  const result = await h.coordinator.authenticate(async () => { authenticationCalls++; h.user(principal); return { user: principal }; }, "Entered name");
  assert.equal(result.kind, "setup_pending");
  assert.equal(h.coordinator.getSnapshot().kind, "retryable_failure");
  h.coordinator.acceptRead(principal.uid, { kind: "missing" }, null);
  assert.equal(h.attempts(), 1);
  h.failure(false);
  assert.equal((await h.coordinator.retry()).kind, "ready");
  assert.equal(authenticationCalls, 1);
  assert.deepEqual(h.seeds.map((seed) => seed.displayName), ["Entered name", "Entered name"]);
});

test("persisted session initializes only an explicit missing document and accepts null name", async () => {
  const h = harness();
  h.user(principal);
  h.coordinator.observeSession(principal);
  h.coordinator.acceptRead(principal.uid, undefined, new Error("Read unavailable"));
  assert.equal(h.attempts(), 0);
  assert.equal(h.coordinator.getSnapshot().kind, "retryable_failure");
  h.coordinator.acceptRead(principal.uid, { kind: "found", profile: h.profile }, null);
  assert.equal(h.attempts(), 0);
  const missing = harness();
  missing.user(principal);
  missing.coordinator.observeSession(principal);
  missing.coordinator.acceptRead(principal.uid, { kind: "missing" }, null);
  await missing.coordinator.retry();
  assert.equal(missing.attempts(), 1);
  assert.equal(missing.seeds[0].displayName, null);
});

test("sign-out during initialization discards late completion and cache publication", async () => {
  let user = null;
  let finish;
  const published = [];
  const coordinator = createAccountSetupCoordinator({
    currentUser: () => user,
    initialize: () => new Promise((resolve) => { finish = resolve; }),
    read: async () => ({ kind: "found", profile: { uid: "owner" } }),
    publish: (...args) => published.push(args),
  });
  const pending = coordinator.authenticate(async () => { user = principal; return { user }; });
  await Promise.resolve();
  await Promise.resolve();
  user = null;
  coordinator.observeSession(null);
  finish({ kind: "created" });
  assert.equal((await pending).kind, "ignored");
  assert.equal(coordinator.getSnapshot().kind, "guest");
  assert.deepEqual(published, []);
});

test("recovery retry reads again before deciding whether an account needs initialization", async () => {
  let reads = 0;
  let writes = 0;
  const coordinator = createAccountSetupCoordinator({
    currentUser: () => principal,
    initialize: async () => { writes++; return { kind: "created" }; },
    read: async () => { reads++; return { kind: "found", profile: { uid: "owner" } }; },
    publish: () => {},
  });
  coordinator.observeSession(principal);
  coordinator.acceptRead("owner", undefined, new Error("Temporary read failure"));
  const first = coordinator.retry();
  const second = coordinator.retry();
  assert.equal(first, second);
  assert.equal((await first).kind, "ready");
  assert.equal(reads, 1);
  assert.equal(writes, 0);
});

test("account switching discards stale recovery without publishing the former profile", async () => {
  let user = principal;
  let finish;
  const published = [];
  const coordinator = createAccountSetupCoordinator({
    currentUser: () => user,
    initialize: async () => ({ kind: "created" }),
    read: () => new Promise((resolve) => { finish = resolve; }),
    publish: (...args) => published.push(args),
  });
  coordinator.observeSession(user);
  const pending = coordinator.retry();
  await Promise.resolve();
  user = { ...principal, uid: "other" };
  coordinator.observeSession(user);
  finish({ kind: "found", profile: { uid: "owner" } });
  assert.equal((await pending).kind, "ignored");
  assert.equal(coordinator.getSnapshot().uid, "other");
  assert.deepEqual(published, []);
});

test("an authentication adapter failure after Firebase signs in retains the typed setup seed", async () => {
  const h = harness();
  const result = await h.coordinator.authenticate(async () => { h.user(principal); throw new Error("Provider completion unavailable"); }, "Entered name");
  assert.equal(result.kind, "setup_pending");
  assert.equal(h.coordinator.getSnapshot().kind, "retryable_failure");
  assert.equal((await h.coordinator.retry()).kind, "ready");
  assert.equal(h.seeds[0].displayName, "Entered name");
});

test("a synchronous initializer failure settles and permits an explicit retry", async () => {
  let attempts = 0;
  const coordinator = createAccountSetupCoordinator({
    currentUser: () => principal,
    initialize: () => { attempts++; throw new Error("Unexpected adapter failure"); },
    read: async () => ({ kind: "missing" }),
    publish: () => {},
  });
  coordinator.observeSession(principal);
  coordinator.acceptRead("owner", { kind: "missing" }, null);
  await coordinator.retry();
  await coordinator.retry();
  assert.equal(attempts, 2);
  assert.equal(coordinator.getSnapshot().kind, "retryable_failure");
});

test("existing seed conflicts never become profile creation or automatic retries", () => {
  const h = harness(); h.user(principal); h.coordinator.observeSession(principal);
  h.coordinator.acceptRead(principal.uid, { kind: "conflict", reason: "Stored identity differs" }, null);
  h.coordinator.acceptRead(principal.uid, { kind: "missing" }, null);
  assert.equal(h.coordinator.getSnapshot().kind, "conflict");
  assert.equal(h.attempts(), 0);
});

test("tagged persisted identity violations become nonretryable setup conflicts", async () => {
  const conflict = Object.assign(new Error("Stored identity differs"), { code: "profile/setup-conflict" });
  const coordinator = createAccountSetupCoordinator({
    currentUser: () => principal,
    initialize: async () => { throw conflict; },
    read: async () => { throw conflict; },
    publish: () => {},
  });
  coordinator.observeSession(principal);
  coordinator.acceptRead("owner", undefined, conflict);
  assert.equal(coordinator.getSnapshot().kind, "conflict");
  coordinator.acceptRead("owner", { kind: "missing" }, null);
  assert.equal(coordinator.getSnapshot().kind, "conflict");
  await coordinator.retry();
  assert.equal(coordinator.getSnapshot().kind, "conflict");
  assert.equal(coordinator.getSnapshot().reason, "Stored identity differs");
});
