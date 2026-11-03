import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { format, parseISO } from "date-fns";
import { enUS, zhTW } from "react-day-picker/locale";
import { loadSourceModule } from "./helpers/source-module.mjs";

function readSource(path) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function findVariable(source, name) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, `${name} must exist`);
  return found;
}

function evaluate(node, source, context) {
  const code = ts.transpileModule(`(${node.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return runInNewContext(code, context);
}

function readSubmit(source, context) {
  const options = findVariable(source, "form").arguments[0];
  const submit = options.properties.find((property) => property.name?.getText(source) === "onSubmit");
  assert.ok(submit);
  return evaluate(submit.initializer, source, context);
}

for (const [route, mutationName] of [["signin", "signInMutation"], ["signup", "signUpMutation"]]) {
  const source = readSource(`src/app/(auth)/${route}/client-page.tsx`);
  test(`${route} remains submitting until the authentication request settles`, async () => {
    let resolve;
    const requests = [];
    const effect = new Promise((done) => { resolve = done; });
    const submit = readSubmit(source, {
      [mutationName]: { isPending: false, mutateAsync: (input) => { requests.push(input); return effect; } },
    });
    const value = { email: "member@example.test", password: "valid-password", displayName: "Member" };
    let settled = false;
    const pending = submit({ value }).then(() => { settled = true; });
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "email");
    assert.equal(requests[0].payload, value);
    resolve({ user: { uid: "member" } });
    await pending;
    assert.equal(settled, true);
  });

  test(`${route} does not start another authentication request while pending`, async () => {
    let requests = 0;
    const submit = readSubmit(source, {
      [mutationName]: { isPending: true, mutateAsync: async () => { requests++; } },
    });
    await submit({ value: {} });
    assert.equal(requests, 0);
  });

  test(`${route} retains entered values after a rejected authentication request`, async () => {
    const value = { email: "member@example.test", password: "valid-password" };
    const before = { ...value };
    const submit = readSubmit(source, {
      [mutationName]: { isPending: false, mutateAsync: async () => { throw new Error("Rejected"); } },
    });
    await submit({ value });
    assert.deepEqual(value, before);
  });
}

const registrationSource = readSource("src/app/(works)/school/summer/2026/registration/client-page.tsx");
function registrationSetup({ hasConflict = true, authenticated = true, rejects = false } = {}) {
  const requests = [];
  const dialogs = [];
  const drafts = [];
  const redirects = [];
  const resolver = { current: null };
  const context = {
    authUser: authenticated ? { uid: "owner" } : null,
    profile: {},
    t: (key) => key,
    toast: { warning() {}, error() {} },
    writeRegistrationDraft: (value) => drafts.push(value),
    buildSignUpHref: (email) => `/signup?email=${email}`,
    router: { push: (href) => redirects.push(href) },
    createProfileDetailsSnapshotFromProfile: () => ({}),
    createProfileDetailsSnapshotFromRegistration: () => ({}),
    hasExistingProfileDetailsConflict: () => hasConflict,
    profileConfirmationResolver: resolver,
    setIsProfileConfirmationOpen: (open) => dialogs.push(open),
    submitMutation: {
      mutateAsync: async (value) => {
        requests.push(value);
        if (rejects) throw new Error("Registration failed");
      },
    },
  };
  return {
    submit: readSubmit(registrationSource, context),
    choose: evaluate(findVariable(registrationSource, "resolveProfileConfirmation"), registrationSource, context),
    abort: () => { const resolve = resolver.current; resolver.current = null; resolve?.(null); },
    requests, dialogs, drafts, redirects,
  };
}

const registration = { parent: { email: "parent@example.test" }, consents: { liabilityMedicalRelease: true } };
for (const sync of [true, false]) {
  test(`registration still submits after choosing profile sync = ${sync}`, async () => {
    const flow = registrationSetup();
    const pending = flow.submit({ value: registration });
    assert.equal(flow.requests.length, 0);
    assert.deepEqual(flow.dialogs, [true]);
    flow.choose(sync);
    await pending;
    assert.equal(flow.requests.length, 1);
    assert.equal(flow.requests[0].syncProfileDetails, sync);
    assert.equal(flow.requests[0].syncFamilyProfile, true);
    assert.equal(flow.requests[0].parent, registration.parent);
    flow.choose(!sync);
    assert.equal(flow.requests.length, 1, "A repeated dismissal must not submit again");
  });
}

test("leaving registration while confirmation is open settles without submitting", async () => {
  const flow = registrationSetup();
  const pending = flow.submit({ value: registration });
  flow.abort();
  await pending;
  assert.equal(flow.requests.length, 0);
});

test("registration without a profile conflict does not open a confirmation", async () => {
  const flow = registrationSetup({ hasConflict: false });
  await flow.submit({ value: registration });
  assert.deepEqual(flow.dialogs, []);
  assert.equal(flow.requests[0].syncProfileDetails, true);
});

test("a guest registration saves the draft and returns to signup without submitting", async () => {
  const flow = registrationSetup({ authenticated: false });
  await flow.submit({ value: registration });
  assert.deepEqual(flow.drafts, [registration]);
  assert.equal(flow.requests.length, 0);
  assert.deepEqual(flow.redirects, ["/signup?email=parent@example.test"]);
});

test("registration rejection retains the existing draft and input values", async () => {
  const flow = registrationSetup({ hasConflict: false, rejects: true });
  await flow.submit({ value: registration });
  assert.equal(flow.requests[0].parent, registration.parent);
  assert.deepEqual(flow.drafts, []);
  assert.deepEqual(flow.redirects, []);
});

const { getValidationMessageKey } = loadSourceModule("src/lib/forms/validation-message.ts");
test("validation presentation translates known schema errors without changing their priority", () => {
  assert.equal(getValidationMessageKey({ onBlur: [{ message: "This field is required." }], onSubmit: [{ message: "Enter a valid email address." }] }), "validation.required");
  assert.equal(getValidationMessageKey({ onSubmit: [{ message: "Enter a valid email address." }] }), "validation.email");
  assert.equal(getValidationMessageKey({ onBlur: [{ code: "invalid_enum_value", message: "Invalid enum value" }] }), "validation.choice");
  assert.equal(getValidationMessageKey({ onChange: [{ message: "Select a valid date." }] }), "validation.date");
  assert.equal(getValidationMessageKey({ onBlur: [], onSubmit: undefined }), null);
});

test("unknown validation messages receive a localized fallback instead of leaking arbitrary text", () => {
  assert.equal(getValidationMessageKey({ onSubmit: [{ message: "private infrastructure detail" }] }), "validation.invalid");
  assert.equal(getValidationMessageKey({ onSubmit: "__proto__" }), "validation.invalid");
});

const pickerDeclaration = registrationSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "DatePickerDialogField");
for (const [language, locale, dateLabel] of [["en", enUS, "May 26th, 2026"], ["zh-TW", zhTW, "2026年5月26日"]]) {
  test(`registration birthday picker uses ${language} while preserving its date limits and ISO selection`, () => {
    let calendar;
    const updates = [];
    const wrap = ({ children }) => React.createElement("div", null, children);
    const imports = Object.fromEntries(["Dialog", "DialogTrigger", "DialogContent", "DialogHeader", "DialogTitle", "DialogFooter", "DialogClose", "Button"].map((name) => [name, wrap]));
    const code = ts.transpileModule(`(${pickerDeclaration.getText(registrationSource)})`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
    }).outputText;
    const minimum = new Date(2010, 0, 1);
    const Picker = runInNewContext(code, {
      React, ...imports,
      useState: React.useState,
      useTranslation: () => ({ i18n: { resolvedLanguage: language } }),
      format, parseISO, enUS, zhTW,
      CHILD_BIRTHDAY_MIN_DATE: minimum,
      CalendarIcon: () => null,
      Calendar: (props) => { calendar = props; return null; },
    });
    const html = renderToStaticMarkup(React.createElement(Picker, {
      value: "2026-05-26", onChange: (value) => updates.push(value), label: "Birthday", closeLabel: "Close",
    }));
    assert.ok(html.includes(dateLabel));
    assert.equal(calendar.locale, locale);
    assert.equal(calendar.disabled.before, minimum);
    assert.equal(calendar.disabled.after, calendar.endMonth);
    calendar.onSelect(new Date(2026, 4, 27));
    assert.deepEqual(updates, ["2026-05-27"]);
  });
}
