import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import i18next from "i18next";
import ts from "typescript";

const source = ts.createSourceFile(
  "pricing-section.tsx",
  readFileSync(new URL("../src/app/(support)/components/pricing-section.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let errorCallback;
function findErrorCallback(node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(source) === "onError") {
    errorCallback = node.initializer;
  }
  ts.forEachChild(node, findErrorCallback);
}
findErrorCallback(source);
assert.ok(errorCallback, "The checkout error callback must exist");
const callbackCode = ts.transpileModule(`(${errorCallback.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const language of ["en", "zh-TW"]) {
  test(`checkout displays localized failure feedback in ${language}`, async () => {
    const messages = JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/glory-share.json`, import.meta.url), "utf8"));
    const i18n = i18next.createInstance();
    await i18n.init({ lng: language, resources: { [language]: { "glory-share": messages } } });
    const notifications = [];
    const errors = [];
    const onError = runInNewContext(callbackCode, {
      t: i18n.getFixedT(language, "glory-share"),
      toast: { error: (message) => notifications.push(message) },
      console: { error: (error) => errors.push(error) },
    });
    const failure = new Error("Checkout session failed");

    onError(failure);
    assert.deepEqual(notifications, [messages.gloryShare.toast.checkoutError]);
    assert.deepEqual(errors, [failure]);
  });
}
