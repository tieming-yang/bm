import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";

const routePath = fileURLToPath(new URL("../src/app/api/subscriptions/[id]/cancel/route.ts", import.meta.url));
const contracts = loadSourceModule(fileURLToPath(new URL("../src/lib/subscriptions/cancellation.ts", import.meta.url)));
const policy = loadSourceModule(fileURLToPath(new URL("../src/lib/policy.ts", import.meta.url)));

function setup(options = {}) {
  const effects = [];
  let providerStatus = options.providerStatus ?? "active";
  const provider = () => ({ id: "sub_owned", metadata: { uid: "owner" }, status: providerStatus, ...options.provider });
  const route = loadSourceModule(routePath, {
    "@/lib/subscriptions/cancellation": contracts,
    "@/lib/policy": policy,
    "@/lib/firebase/firebase-admin": {
      auth: {
        verifyIdToken: async (token) => {
          effects.push(["authenticate", token]);
          if (options.authFailure) throw options.authFailure;
          return { uid: options.actorUid ?? "owner" };
        },
      },
      db: {
        doc: (path) => ({
          get: async () => {
            effects.push(["read", path]);
            if (options.databaseFailure) throw options.databaseFailure;
            if (path.includes("/subscriptions/")) {
              return {
                exists: options.relationshipExists ?? true,
                data: () => options.stored ?? { id: "sub_owned" },
              };
            }
            return {
              exists: options.actorExists ?? true,
              data: () => options.actorProfile ?? { role: options.role ?? "user" },
            };
          },
        }),
      },
    },
    "@/lib/stripe": {
      stripe: {
        subscriptions: {
          retrieve: async (id) => {
            effects.push(["retrieve", id]);
            if (options.retrieveFailure) throw options.retrieveFailure;
            return provider();
          },
          cancel: async (id) => {
            effects.push(["cancel", id]);
            if (options.cancelFailure) throw options.cancelFailure;
            providerStatus = "canceled";
            return options.cancelResult ?? provider();
          },
        },
      },
    },
  });
  async function call({ authorization = "Bearer valid-token", body = { uid: "owner" }, rawBody, id = "sub_owned" } = {}) {
    const request = new Request("https://example.test/api/subscriptions/sub_owned/cancel", {
      method: "POST",
      headers: authorization === null ? {} : { Authorization: authorization },
      body: rawBody ?? JSON.stringify(body),
    });
    const response = await route.POST(request, { params: Promise.resolve({ id }) });
    return { status: response.status, body: await response.json() };
  }
  return { call, effects };
}

function assertNoProviderEffects(effects) {
  assert.equal(effects.some(([type]) => type === "retrieve" || type === "cancel"), false);
}

for (const authorization of [null, "Basic invalid", "Bearer", "Bearer invalid extra-token"]) {
  test(`cancellation rejects missing/malformed authorization: ${authorization}`, async () => {
    const { call, effects } = setup();
    assert.equal((await call({ authorization })).status, 401);
    assert.deepEqual(effects, []);
  });
}

for (const code of ["auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled"]) {
  test(`cancellation rejects ${code} before database or provider effects`, async () => {
    const { call, effects } = setup({ authFailure: { code } });
    assert.equal((await call()).status, 401);
    assert.deepEqual(effects, [["authenticate", "valid-token"]]);
  });
}

test("owner cancellation authenticates and validates ownership before its single provider mutation", async () => {
  const { call, effects } = setup();
  assert.deepEqual(await call(), { status: 200, body: { status: 200, outcome: "canceled" } });
  assert.deepEqual(effects, [
    ["authenticate", "valid-token"], ["read", "profiles/owner/subscriptions/sub_owned"],
    ["retrieve", "sub_owned"], ["cancel", "sub_owned"],
  ]);
});

for (const role of ["admin", "staff"]) {
  test(`${role} can cancel another account's owned subscription`, async () => {
    const { call, effects } = setup({ actorUid: "operator", role });
    assert.equal((await call()).status, 200);
    assert.deepEqual(effects[1], ["read", "profiles/operator"]);
    assert.deepEqual(effects.at(-1), ["cancel", "sub_owned"]);
  });
}

for (const actorProfile of [{ role: "user" }, { uid: "owner", role: "user" }, {}]) {
  test(`forged body or editable profile UID cannot authorize cross-account cancellation: ${JSON.stringify(actorProfile)}`, async () => {
    const { call, effects } = setup({ actorUid: "attacker", actorProfile });
    assert.equal((await call()).status, 403);
    assertNoProviderEffects(effects);
  });
}

test("unknown privileged role fails closed", async () => {
  const { call, effects } = setup({ actorUid: "attacker", role: "superadmin" });
  assert.equal((await call()).status, 500);
  assertNoProviderEffects(effects);
});

test("missing actor profile cannot grant privileged access", async () => {
  const { call, effects } = setup({ actorUid: "attacker", actorExists: false });
  assert.equal((await call()).status, 403);
  assertNoProviderEffects(effects);
});

for (const body of [null, [], {}, { uid: 1 }, { uid: "" }, { uid: "." }, { uid: ".." }, { uid: "owner/subscriptions/other" }, { uid: "x".repeat(129) }]) {
  test(`cancellation rejects malformed target input: ${JSON.stringify(body)}`, async () => {
    const { call, effects } = setup();
    assert.equal((await call({ body })).status, 422);
    assertNoProviderEffects(effects);
  });
}

for (const id of ["", "not-a-subscription", "sub_owned/other", "sub_%2Fother"]) {
  test(`cancellation rejects malformed subscription ID: ${id}`, async () => {
    const { call, effects } = setup();
    assert.equal((await call({ id })).status, 422);
    assertNoProviderEffects(effects);
  });
}

test("malformed JSON returns an explicit client failure", async () => {
  const { call, effects } = setup();
  assert.equal((await call({ rawBody: "{" })).status, 400);
  assertNoProviderEffects(effects);
});

test("knowing an ID without the server-owned relationship is insufficient", async () => {
  const { call, effects } = setup({ relationshipExists: false });
  assert.equal((await call()).status, 404);
  assertNoProviderEffects(effects);
});

for (const stored of [{ id: "sub_different" }, { id: 42 }, { id: null }]) {
  test(`malformed persisted subscription identity fails before provider access: ${JSON.stringify(stored)}`, async () => {
    const { call, effects } = setup({ stored });
    assert.equal((await call()).status, 500);
    assertNoProviderEffects(effects);
  });
}

test("legacy partial subscription documents retain legitimate cancellation access", async () => {
  const { call } = setup({ stored: { status: "active" } });
  assert.equal((await call()).status, 200);
});

for (const [provider, status] of [
  [{ id: "sub_other" }, 500], [{ metadata: { uid: "victim" } }, 409],
  [{ metadata: {} }, 500], [{ status: "unknown" }, 500],
]) {
  test(`provider identity/state must validate before cancellation: ${JSON.stringify(provider)}`, async () => {
    const { call, effects } = setup({ provider });
    assert.equal((await call()).status, status);
    assert.equal(effects.some(([type]) => type === "cancel"), false);
  });
}

test("already-canceled retries succeed without a new provider mutation", async () => {
  const { call, effects } = setup();
  await call();
  assert.deepEqual(await call(), { status: 200, body: { status: 200, outcome: "already_canceled" } });
  assert.equal(effects.filter(([type]) => type === "cancel").length, 1);
});

test("already-canceled state never bypasses authorization", async () => {
  const { call, effects } = setup({ actorUid: "attacker", providerStatus: "canceled" });
  assert.equal((await call()).status, 403);
  assertNoProviderEffects(effects);
});

for (const kind of ["authFailure", "databaseFailure", "retrieveFailure", "cancelFailure"]) {
  test(`unexpected ${kind} stays a server failure without leaking provider details`, async () => {
    const { call } = setup({ [kind]: new Error("private-provider-secret") });
    const response = await call();
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Unable to cancel subscription" });
  });
}

for (const cancelResult of [
  { id: "sub_other", metadata: { uid: "owner" }, status: "canceled" },
  { id: "sub_owned", metadata: { uid: "victim" }, status: "canceled" },
  { id: "sub_owned", metadata: { uid: "owner" }, status: "active" },
]) {
  test(`success requires provider cancellation confirmation: ${JSON.stringify(cancelResult)}`, async () => {
    const { call } = setup({ cancelResult });
    assert.equal((await call()).status, 500);
  });
}
