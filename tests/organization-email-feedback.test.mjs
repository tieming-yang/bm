import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile(
  "client-profile-page.tsx",
  readFileSync(new URL("../src/app/(auth)/profile/[userId]/client-profile-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let options;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "saveMutation") {
    options = node.initializer.arguments[0];
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(options);
const code = ts.transpileModule(`(${options.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ token = "id-token", status = 200, failure } = {}) {
  const requests = [];
  const notifications = [];
  const invalidations = [];
  const mutations = runInNewContext(code, {
    assertIsDefined: (value) => assert.notEqual(value, undefined),
    Auth: { user: token === null ? null : { getIdToken: async () => token } },
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (failure) throw failure;
      return new Response(null, { status });
    },
    t: (key) => key,
    toast: {
      success: (message) => notifications.push({ type: "success", message }),
      error: (message) => notifications.push({ type: "error", message }),
    },
    setModal() {},
    console: { error() {} },
    query: { invalidateQueries: (value) => invalidations.push(value.queryKey) },
    QueryKey: { profile: (uid) => ["profile", uid] },
  });
  return { ...mutations, requests, notifications, invalidations };
}

const input = { uid: "owner", newOrganizationEmail: "organization@example.test", currentCount: 0 };

test("organization email reports success and refreshes only after a successful response", async () => {
  const mutation = setup();
  const result = await mutation.mutationFn(input);
  mutation.onSuccess(result);
  assert.equal(result.status, "updated");
  assert.equal(mutation.requests[0].url, "/api/profiles/owner/organization-email");
  assert.equal(mutation.requests[0].init.headers.Authorization, "Bearer id-token");
  assert.deepEqual(JSON.parse(mutation.requests[0].init.body), { newOrganizationEmail: input.newOrganizationEmail });
  assert.deepEqual(mutation.notifications, [{ type: "success", message: "organization.toast.success" }]);
  assert.deepEqual(mutation.invalidations, [["profile", "owner"]]);
});

for (const status of [400, 401, 403, 409, 422, 500]) {
  test(`organization email reports HTTP ${status} as rejection without success or refresh`, async () => {
    const mutation = setup({ status });
    const result = await mutation.mutationFn(input);
    mutation.onSuccess(result);
    assert.equal(result.status, "rejected");
    assert.deepEqual(mutation.notifications, [{ type: "error", message: "organization.toast.error" }]);
    assert.deepEqual(mutation.invalidations, []);
  });
}

test("organization email rejects missing authentication before sending a request", async () => {
  const mutation = setup({ token: null });
  const result = await mutation.mutationFn(input);
  mutation.onSuccess(result);
  assert.deepEqual(mutation.requests, []);
  assert.deepEqual(mutation.notifications, [{ type: "error", message: "organization.toast.error" }]);
});

test("organization email keeps network errors on the mutation error path", async () => {
  const failure = new Error("Network unavailable");
  const mutation = setup({ failure });
  await assert.rejects(mutation.mutationFn(input), (error) => error === failure);
  mutation.onError(failure);
  assert.deepEqual(mutation.notifications, [{ type: "error", message: "organization.toast.error" }]);
  assert.deepEqual(mutation.invalidations, []);
});
