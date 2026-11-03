import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import React from "react";
import ts from "typescript";
import { loadSourceModule } from "./helpers/source-module.mjs";

const { CancellationResultSchema } = loadSourceModule(fileURLToPath(new URL("../src/lib/subscriptions/cancellation.ts", import.meta.url)));
const source = ts.createSourceFile(
  "client-profile-page.tsx",
  readFileSync(new URL("../src/app/(auth)/profile/[userId]/client-profile-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let options;
let controls;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "cancelMutation") {
    options = node.initializer.arguments[0];
  }
  if (ts.isConditionalExpression(node) && node.condition.getText(source).includes('subscriptions?.at(-1)?.status !== "canceled"')) {
    controls = node;
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(options);
assert.ok(controls);
const optionsCode = ts.transpileModule(`(${options.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const controlsCode = ts.transpileModule(`(${controls.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function setup({ token = "id-token", status = 200, body = { status: 200, outcome: "canceled" }, failure } = {}) {
  const requests = [];
  const notifications = [];
  const invalidations = [];
  const mutation = runInNewContext(optionsCode, {
    Auth: { user: token === null ? null : { getIdToken: async () => token } },
    assertIsDefined: (value) => assert.notEqual(value, undefined),
    CancellationResultSchema,
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (failure) throw failure;
      return Response.json(body, { status });
    },
    console: { error() {} },
    setModal() {},
    t: (key) => key,
    toast: Object.fromEntries(["success", "warning", "error"].map((type) => [type, (message) => notifications.push({ type, message })])),
    query: { invalidateQueries: (value) => invalidations.push(value.queryKey) },
    QueryKey: { profile: (uid) => ["profile", uid] },
  });
  return { ...mutation, requests, notifications, invalidations };
}

const input = { uid: "owner", subscriptionId: "sub_owned" };

test("profile cancellation sends current authentication and refreshes the target profile", async () => {
  const mutation = setup();
  mutation.onSuccess(await mutation.mutationFn(input));
  assert.equal(mutation.requests[0].url, "/api/subscriptions/sub_owned/cancel");
  assert.equal(mutation.requests[0].init.headers.Authorization, "Bearer id-token");
  assert.deepEqual(JSON.parse(mutation.requests[0].init.body), { uid: "owner" });
  assert.deepEqual(mutation.notifications, [{ type: "success", message: "gloryShareBadge.toast.cancelSuccessfully" }]);
  assert.deepEqual(mutation.invalidations, [["profile", "owner"]]);
});

test("profile cancellation uses the explicit retry outcome rather than provider error text", async () => {
  const mutation = setup({ body: { status: 200, outcome: "already_canceled" } });
  mutation.onSuccess(await mutation.mutationFn(input));
  assert.deepEqual(mutation.notifications, [{ type: "warning", message: "gloryShareBadge.toast.canceledAlready" }]);
  assert.deepEqual(mutation.invalidations, [["profile", "owner"]]);
});

for (const status of [401, 403, 404, 409, 422, 500]) {
  test(`profile cancellation reports HTTP ${status} without success or stale refresh`, async () => {
    const mutation = setup({ status });
    mutation.onSuccess(await mutation.mutationFn(input));
    assert.deepEqual(mutation.notifications, [{ type: "error", message: "gloryShareBadge.toast.cancelFailed" }]);
    assert.deepEqual(mutation.invalidations, []);
  });
}

test("profile cancellation stops before a request when signed out", async () => {
  const mutation = setup({ token: null });
  mutation.onSuccess(await mutation.mutationFn(input));
  assert.deepEqual(mutation.requests, []);
  assert.deepEqual(mutation.notifications, [{ type: "error", message: "gloryShareBadge.toast.cancelFailed" }]);
});

for (const body of [null, { status: 200 }, { status: 200, outcome: "unknown" }]) {
  test(`profile cancellation rejects malformed success responses: ${JSON.stringify(body)}`, async () => {
    const mutation = setup({ body });
    await assert.rejects(mutation.mutationFn(input));
    assert.deepEqual(mutation.notifications, []);
    assert.deepEqual(mutation.invalidations, []);
  });
}

test("profile cancellation reports network failures through its error callback", async () => {
  const failure = new Error("Network unavailable");
  const mutation = setup({ failure });
  await assert.rejects(mutation.mutationFn(input), (error) => error === failure);
  mutation.onError(failure);
  assert.deepEqual(mutation.notifications, [{ type: "error", message: "gloryShareBadge.toast.cancelFailed" }]);
});

function renderControls(memberType, status = "active", isPending = false, mutate = () => {}) {
  const components = ["Dialog", "DialogTrigger", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription", "DialogFooter", "DialogClose", "Button"];
  return runInNewContext(controlsCode, {
    React,
    ...Object.fromEntries(components.map((name) => [name, name])),
    profile: { uid: "editable-alias", memberType, lastSubscriptionId: "sub_owned", subscriptions: [{ status }] },
    userId: "canonical-owner",
    modal: "none", setModal() {}, t: (key) => key,
    cancelMutation: { isPending, mutate },
    gloryShareEndAtString: "December 1, 2026",
  });
}

function findElement(node, type) {
  if (node?.type === type) return node;
  const children = React.Children.toArray(node?.props?.children);
  for (const child of children) {
    if (child && typeof child === "object") {
      const found = findElement(child, type);
      if (found) return found;
    }
  }
}

for (const memberType of ["monthly", "yearly", "lifeTime", "free"]) {
  test(`${memberType} cancellation controls preserve plan eligibility`, () => {
    const trigger = findElement(renderControls(memberType), "DialogTrigger");
    assert.equal(Boolean(trigger), ["monthly", "yearly"].includes(memberType));
  });
}

test("canceled subscriptions show their end date instead of cancellation controls", () => {
  const tree = renderControls("monthly", "canceled");
  assert.equal(findElement(tree, "DialogTrigger"), undefined);
  assert.match(JSON.stringify(tree), /December 1, 2026/);
});

test("pending cancellation disables repeat confirmation clicks", () => {
  const button = findElement(renderControls("monthly", "active", true), "Button");
  assert.equal(button.props.disabled, true);
});

test("cancellation targets the canonical requested account instead of an editable profile UID", () => {
  const requests = [];
  const button = findElement(renderControls("yearly", "active", false, (value) => requests.push(value)), "Button");
  button.props.onClick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].uid, "canonical-owner");
  assert.equal(requests[0].subscriptionId, "sub_owned");
});
