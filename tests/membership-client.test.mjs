import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSourceModule } from "./helpers/source-module.mjs";
import * as contracts from "../src/lib/membership/contracts.ts";
import * as client from "../src/lib/membership/client.ts";
import { hasOpenRecurringBilling } from "../src/lib/subscriptions/billing.ts";

const en = JSON.parse(readFileSync("src/lib/i18n/locales/en/membership-claim.json", "utf8"));
const zh = JSON.parse(readFileSync("src/lib/i18n/locales/zh-TW/membership-claim.json", "utf8"));
const greetCopy = JSON.parse(readFileSync("src/lib/i18n/locales/en/greet.json", "utf8"));
const sessionId = "cs_test_fixture";
const makeUser = (emailVerified) => ({ uid: "user-fixture", email: "account@example.com", emailVerified, getIdToken: async () => "verified-token", reload: async () => {} });
const translate = (copy) => (key, values = {}) => {
  const text = key.split(".").reduce((value, segment) => value?.[segment], copy);
  assert.equal(typeof text, "string", `Missing translation: ${key}`);
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => values[name] ?? "");
};
const link = ({ children, ...props }) => React.createElement("a", props, children);

function mockWindow(t, value) {
  const previous = globalThis.window;
  globalThis.window = value;
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
}

function renderClaim({ user = null, session = sessionId, sendVerification = async () => {}, authLoading = false } = {}) {
  const buttons = [];
  const states = [];
  const cleanups = [];
  const invalidations = [];
  const { default: MembershipClaim } = loadSourceModule("src/components/membership-claim.tsx", {
    react: {
      ...React,
      useState: (initial) => [typeof initial === "function" ? initial() : initial, (value) => states.push(value)],
      useRef: (value) => ({ current: value }),
      useEffect: (effect) => cleanups.push(effect()),
    },
    "next/link": link,
    "firebase/auth": { sendEmailVerification: sendVerification },
    "@tanstack/react-query": { useQueryClient: () => ({ invalidateQueries: async (value) => invalidations.push(value), setQueryData() {} }) },
    "@/components/ui/button": { Button: ({ children, asChild, ...props }) => {
      buttons.push(props);
      return asChild ? children : React.createElement("button", props, children);
    } },
    "@/hooks/use-auth-user": () => ({ authUser: user, isAuthUserLoading: authLoading }),
    "@/hooks/use-translation": () => ({ t: translate(en), currentLanguage: "en" }),
    "@/models/auth": { user, signOut: async () => {} },
    "@/lib/firebase/firebase": { auth: {} },
    "@/utils/query-keys": { QueryKey: { profile: (uid) => ["profile", uid], authUser: ["auth", "user"] } },
    "@/lib/membership/client": client,
  });
  return {
    html: renderToStaticMarkup(React.createElement(MembershipClaim, { sessionId: session })),
    buttons, states, invalidations,
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

function renderGreeting({ user = null, member = false, getProfile = async () => ({ memberType: member ? "monthly" : "free" }) } = {}) {
  const buttons = [];
  const destinations = [];
  const { default: Greet } = loadSourceModule("src/components/greet.tsx", {
    "next/link": link,
    "next/image": ({ children, ...props }) => React.createElement("img", props),
    "next/navigation": { useRouter: () => ({ push: (path) => destinations.push(path) }) },
    "@tanstack/react-query": { useQueryClient: () => ({ fetchQuery: async ({ queryFn }) => queryFn() }) },
    "@/components/ui/button": { Button: ({ children, ...props }) => {
      buttons.push(props);
      return React.createElement("button", props, children);
    } },
    "./greet.module.css": new Proxy({}, { get: (_, key) => key }),
    "@/hooks/use-translation": () => ({ t: translate(greetCopy), currentLanguage: "en", changeLanguage() {} }),
    "@/hooks/use-auth-user": () => ({ authUser: user, isAuthUserLoading: false }),
    "@/models/auth": { user },
    "@/models/profiles": { get: getProfile, isGloryShareMember: (profile) => profile.memberType === "monthly" },
    "@/utils/query-keys": { QueryKey: { profile: (uid) => ["profile", uid] } },
    "@/lib/membership/client": client,
    "@/lib/subscriptions/billing": { hasOpenRecurringBilling },
    "@/lib/greet/contracts": {},
    "@/lib/greet/client": {},
  });
  renderToStaticMarkup(React.createElement(Greet));
  return { support: buttons.find((button) => button["aria-label"] === greetCopy.support), destinations };
}

test("guest activation is neutral and keeps the session through both auth links", () => {
  const { html, buttons } = renderClaim();
  assert.match(html, /Activate your membership/);
  assert.match(html, /We’ll check your payment when you activate/);
  assert.doesNotMatch(html, /membership is now active|account@example.com/);
  assert.equal(buttons.some((button) => button.onClick), false);
  for (const route of ["signin", "signup"]) {
    const match = html.match(new RegExp(`href="(/${route}[^\"]+)"`));
    assert.ok(match);
    const url = new URL(match[1].replaceAll("&amp;", "&"), "https://beyond-media.art");
    assert.equal(url.searchParams.get("redirectTo"), `/glory-share/claim?session_id=${sessionId}`);
  }
});

test("invalid links and unresolved auth do not offer activation", () => {
  assert.match(renderClaim({ session: null }).html, /activation link is missing or invalid/);
  const loading = renderClaim({ authLoading: true });
  assert.match(loading.html, /Checking your account/);
  assert.equal(loading.buttons.length, 0);
});

test("email verification is sent only on click and retains the claim return URL", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Claim must not run"); });
  mockWindow(t, { location: { origin: "https://beyond-media.art" } });
  const sent = [];
  const user = makeUser(false);
  const view = renderClaim({ user, sendVerification: async (...args) => sent.push(args) });
  assert.match(view.html, /Send verification email/);
  assert.doesNotMatch(view.html, />Activate membership<\/button>/);
  assert.equal(sent.length, 0);
  await view.buttons[0].onClick();
  assert.deepEqual(sent, [[user, { url: `https://beyond-media.art/glory-share/claim?session_id=${sessionId}` }]]);
  assert.deepEqual(view.states.at(-1), { kind: "notice", message: "verificationSent" });
});

test("verification refresh reloads the Firebase user and forces a fresh token before showing activate", async () => {
  const calls = [];
  const user = makeUser(false);
  user.reload = async () => { calls.push("reload"); user.emailVerified = true; };
  user.getIdToken = async (force) => { calls.push(["token", force]); return "fresh-token"; };
  const view = renderClaim({ user });
  await view.buttons[1].onClick();
  assert.deepEqual(calls, ["reload", ["token", true]]);
  assert.ok(view.states.includes(true));
  assert.deepEqual(view.states.at(-1), { kind: "notice", message: "verificationReady" });
});

test("verified users activate explicitly, repeated clicks share one request, and only success invalidates profile", async (t) => {
  let requests = 0;
  let resolveResponse;
  const response = new Promise((resolve) => { resolveResponse = resolve; });
  t.mock.method(globalThis, "fetch", async () => { requests++; return response; });
  const view = renderClaim({ user: makeUser(true) });
  assert.equal(requests, 0);
  assert.match(view.html, />Activate membership<\/button>/);
  const first = view.buttons[0].onClick();
  const second = view.buttons[0].onClick();
  await Promise.resolve();
  assert.equal(requests, 1);
  resolveResponse(Response.json({ kind: "claimed" }));
  await Promise.all([first, second]);
  assert.deepEqual(view.states.at(-1), { kind: "result", result: { kind: "claimed" } });
  assert.deepEqual(view.invalidations, [{ queryKey: ["profile", "user-fixture"] }]);
});

test("claim results arriving after leaving the account or page are ignored", async (t) => {
  let resolveResponse;
  const response = new Promise((resolve) => { resolveResponse = resolve; });
  t.mock.method(globalThis, "fetch", async () => response);
  const view = renderClaim({ user: makeUser(true) });
  const pending = view.buttons[0].onClick();
  await Promise.resolve();
  view.unmount();
  resolveResponse(Response.json({ kind: "claimed" }));
  await pending;
  assert.equal(view.states.some((state) => state.kind === "result"), false);
  assert.deepEqual(view.invalidations, []);
});

test("existing members go to their account without creating a Stripe checkout", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Checkout must not run"); });
  const view = renderGreeting({ user: makeUser(true), member: true });
  await view.support.onClick();
  assert.deepEqual(view.destinations, ["/profile/user-fixture"]);
});

test("a failed signed-in profile lookup cannot start a second membership", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return Response.json({ kind: "checkout", url: "https://checkout.stripe.com/c/pay/fixture" }); });
  const view = renderGreeting({ user: makeUser(true), getProfile: async () => { throw new Error("Unavailable"); } });
  await view.support.onClick();
  assert.equal(requests, 0);
  assert.deepEqual(view.destinations, []);
});

for (const status of ["past_due", "unpaid", "paused", "incomplete", "trialing", "active"]) {
  test(`Support sends free accounts with ${status} billing to their account without checkout`, async (t) => {
    let requests = 0;
    t.mock.method(globalThis, "fetch", async () => { requests++; throw new Error("Checkout must not run"); });
    const view = renderGreeting({ user: makeUser(true), getProfile: async () => ({
      memberType: "free", lastSubscriptionId: "sub_current",
      subscriptions: [{ id: "sub_current", status, currentPeriodEnd: 1 }],
    }) });
    await view.support.onClick();
    assert.equal(requests, 0);
    assert.deepEqual(view.destinations, ["/profile/user-fixture"]);
  });
}

for (const status of ["canceled", "incomplete_expired"]) {
  test(`Support allows checkout for a free account after terminal ${status} billing`, async (t) => {
    const navigations = [];
    mockWindow(t, { location: { assign: (url) => navigations.push(url) } });
    t.mock.method(globalThis, "fetch", async () => Response.json({ kind: "checkout", url: "https://checkout.stripe.com/c/pay/fixture" }));
    const view = renderGreeting({ user: makeUser(true), getProfile: async () => ({
      memberType: "free", lastSubscriptionId: "sub_current",
      subscriptions: [{ id: "sub_current", status, currentPeriodEnd: 1 }],
    }) });
    await view.support.onClick();
    assert.deepEqual(view.destinations, []);
    assert.deepEqual(navigations, ["https://checkout.stripe.com/c/pay/fixture"]);
  });
}

test("guest checkout guards repeated clicks and keeps its original attempt for retry", async (t) => {
  const requests = [];
  const navigations = [];
  mockWindow(t, { location: { assign: (url) => navigations.push(url) } });
  t.mock.method(globalThis, "fetch", async (_, init) => {
    requests.push(JSON.parse(init.body));
    return requests.length === 1 ? Response.json({ kind: "retryable_failure" }, { status: 503 })
      : Response.json({ kind: "checkout", url: "https://checkout.stripe.com/c/pay/fixture" });
  });
  const view = renderGreeting();
  const first = view.support.onClick();
  const duplicate = view.support.onClick();
  await Promise.all([first, duplicate]);
  assert.equal(requests.length, 1);
  assert.deepEqual(navigations, []);
  await view.support.onClick();
  assert.deepEqual(requests[0], requests[1]);
  assert.deepEqual(navigations, ["https://checkout.stripe.com/c/pay/fixture"]);
});

test("every server outcome has English and Traditional Chinese recovery text", () => {
  for (const kind of contracts.MembershipClaimResultSchema.unwrap().shape.kind.options) {
    assert.equal(typeof en.outcomes[kind], "string");
    assert.equal(typeof zh.outcomes[kind], "string");
  }
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
});

test("claim route rejects duplicate session parameters and keeps noindex neutral metadata", async () => {
  const page = loadSourceModule("src/app/(support)/glory-share/claim/page.tsx", {
    "@/app/metadata": { createPageMetadata: (config) => config, noIndexRobots: { index: false, follow: false } },
    "@/components/membership-claim": () => null,
    "@/lib/membership/contracts": contracts,
  });
  assert.deepEqual(page.metadata.robots, { index: false, follow: false });
  assert.equal(page.metadata.referrer, "no-referrer");
  assert.doesNotMatch(page.metadata.title, /success|confirmed|成功|完成/);
  const valid = await page.default({ searchParams: Promise.resolve({ session_id: sessionId }) });
  assert.equal(valid.props.sessionId, sessionId);
  const duplicate = await page.default({ searchParams: Promise.resolve({ session_id: [sessionId, sessionId] }) });
  assert.equal(duplicate.props.sessionId, null);
});
