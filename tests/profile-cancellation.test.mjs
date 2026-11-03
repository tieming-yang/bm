import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import React from "react";
import ts from "typescript";
import { loadSourceModule } from "./helpers/source-module.mjs";
import { hasOpenRecurringBilling } from "../src/lib/subscriptions/billing.ts";

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
let subscriptionSelection;
let expirySelection;
let freeBillingSection;
let paidMemberSection;
let joinAction;
let couponEnabled;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "cancelMutation") {
    options = node.initializer.arguments[0];
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "subscriptionControls") controls = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "currentSubscription") subscriptionSelection = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "gloryShareEndAtSecs") expirySelection = node.initializer;
  if (ts.isJsxExpression(node) && node.expression) {
    const text = node.expression.getText(source);
    if (text.startsWith("!isGloryShareMember && hasOpenBilling &&")) freeBillingSection = node.expression;
    if (text.startsWith("isGloryShareMember && (")) paidMemberSection = node.expression;
    if (text.startsWith("!isGloryShareMember && !hasOpenBilling &&")) joinAction = node.expression;
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === "useQuery" && node.arguments[0]?.getText(source).includes("QueryKey.coupon")) {
    couponEnabled = node.arguments[0].properties.find((property) => property.name?.getText(source) === "enabled")?.initializer;
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(options);
assert.ok(controls);
assert.ok(subscriptionSelection);
assert.ok(expirySelection);
const selectionCode = ts.transpileModule(`const currentSubscription = ${subscriptionSelection.getText(source)};
({ currentSubscription, expirySeconds: ${expirySelection.getText(source)} });`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
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

function renderControls(memberType, status = "active", isPending = false, mutate = () => {}, membership = {}) {
  const components = ["Dialog", "DialogTrigger", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription", "DialogFooter", "DialogClose", "Button", "ActionSpinner"];
  const profile = { uid: "editable-alias", memberType, lastSubscriptionId: "sub_owned", subscriptions: [{ id: "sub_owned", status }], ...membership };
  const { currentSubscription } = runInNewContext(selectionCode, { profile });
  return runInNewContext(controlsCode, {
    React,
    ...Object.fromEntries(components.map((name) => [name, name])),
    profile,
    currentSubscription,
    hasOpenBilling: hasOpenRecurringBilling(profile),
    isGloryShareMember: memberType !== "free",
    userId: "canonical-owner",
    modal: "none", setModal() {}, t: (key) => key,
    cancelMutation: { isPending, mutate },
    gloryShareEndAtString: "December 1, 2026",
  });
}

function findElement(node, type, predicate = () => true) {
  if (node?.type === type && predicate(node)) return node;
  const children = React.Children.toArray(node?.props?.children);
  for (const child of children) {
    if (child && typeof child === "object") {
      const found = findElement(child, type, predicate);
      if (found) return found;
    }
  }
}

for (const memberType of ["monthly", "yearly", "lifeTime", "free"]) {
  test(`${memberType} cancellation controls preserve plan eligibility`, () => {
    const trigger = findElement(renderControls(memberType), "DialogTrigger");
    assert.equal(Boolean(trigger), ["monthly", "yearly", "free"].includes(memberType));
  });
}

test("canceled subscriptions show their end date instead of cancellation controls", () => {
  const tree = renderControls("monthly", "canceled");
  assert.equal(findElement(tree, "DialogTrigger"), undefined);
  assert.match(JSON.stringify(tree), /December 1, 2026/);
});

test("pending cancellation disables repeat confirmation clicks", () => {
  const button = findElement(renderControls("monthly", "active", true), "Button", (node) => node.props.variant === "destructive");
  assert.equal(button.props.disabled, true);
});

test("cancellation targets the canonical requested account instead of an editable profile UID", () => {
  const requests = [];
  const button = findElement(renderControls("yearly", "active", false, (value) => requests.push(value)), "Button", (node) => node.props.variant === "destructive");
  button.props.onClick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].uid, "canonical-owner");
  assert.equal(requests[0].subscriptionId, "sub_owned");
});

test("unordered subscription history cannot hide cancellation or replace the current paid end date", () => {
  const current = { id: "sub_current", status: "active", currentPeriodEnd: 1_800_000_000 };
  const previous = { id: "sub_previous", status: "canceled", currentPeriodEnd: 1_700_000_000 };
  for (const subscriptions of [[current, previous], [previous, current]]) {
    const membership = { lastSubscriptionId: current.id, subscriptions };
    const selection = runInNewContext(selectionCode, { profile: membership });
    assert.equal(selection.currentSubscription, current);
    assert.equal(selection.expirySeconds, current.currentPeriodEnd);
    const requests = [];
    const tree = renderControls("monthly", "active", false, (value) => requests.push(value), membership);
    assert.ok(findElement(tree, "DialogTrigger"));
    findElement(tree, "Button", (node) => node.props.variant === "destructive").props.onClick();
    assert.equal(requests[0].subscriptionId, current.id);
  }
});

test("claiming a new membership switches controls from the old canceled subscription to the new pointer", () => {
  const previous = { id: "sub_previous", status: "canceled", currentPeriodEnd: 1_700_000_000 };
  const renewed = { id: "sub_renewed", status: "active", currentPeriodEnd: 1_800_000_000 };
  const subscriptions = [renewed, previous];
  const before = { lastSubscriptionId: previous.id, subscriptions };
  const after = { lastSubscriptionId: renewed.id, subscriptions };
  assert.equal(findElement(renderControls("monthly", "active", false, undefined, before), "DialogTrigger"), undefined);
  assert.ok(findElement(renderControls("monthly", "active", false, undefined, after), "DialogTrigger"));
  assert.equal(runInNewContext(selectionCode, { profile: before }).expirySeconds, previous.currentPeriodEnd);
  assert.equal(runInNewContext(selectionCode, { profile: after }).expirySeconds, renewed.currentPeriodEnd);
});

for (const status of ["past_due", "unpaid", "paused", "incomplete", "trialing", "active"]) {
  test(`free accounts retain neutral cancellation for ${status} billing`, () => {
    const requests = [];
    const tree = renderControls("free", status, false, (value) => requests.push(value));
    assert.ok(findElement(tree, "DialogTrigger"));
    const button = findElement(tree, "Button", (node) => node.props.variant === "destructive");
    button.props.onClick();
    assert.equal(requests[0].subscriptionId, "sub_owned");
    assert.match(JSON.stringify(tree), /billing.cancel/);
    assert.doesNotMatch(JSON.stringify(tree), /gloryShareBadge/);
  });
}

for (const status of ["canceled", "incomplete_expired"]) {
  test(`free accounts with terminal ${status} subscriptions have no cancellation dialog`, () => {
    assert.equal(findElement(renderControls("free", status), "DialogTrigger"), undefined);
  });
}

test("expired free membership renders only neutral billing controls and cannot start another checkout", () => {
  assert.ok(freeBillingSection && paidMemberSection && joinAction && couponEnabled);
  const context = {
    React, isGloryShareMember: false, hasOpenBilling: true, isOwnProfile: true,
    subscriptionControls: renderControls("free", "past_due"), t: (key) => key,
    ...Object.fromEntries(["Card", "CardHeader", "CardTitle", "CardContent", "CardFooter"].map((name) => [name, name])),
  };
  const evaluate = (node) => runInNewContext(ts.transpileModule(`(${node.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, context);
  const section = evaluate(freeBillingSection);
  assert.match(JSON.stringify(section), /billing.title/);
  assert.match(JSON.stringify(section), /billing.cancel/);
  assert.doesNotMatch(JSON.stringify(section), /gloryShareBadge|copyCoupon/);
  assert.equal(evaluate(paidMemberSection), false);
  assert.equal(evaluate(joinAction), false);
  assert.equal(evaluate(couponEnabled), false);
});
