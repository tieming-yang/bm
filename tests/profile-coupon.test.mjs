import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import i18next from "i18next";
import ts from "typescript";

const source = ts.createSourceFile(
  "client-profile-page.tsx",
  readFileSync(new URL("../src/app/(auth)/profile/[userId]/client-profile-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let callback;
let memberLabel;
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(source) === "onClick" &&
      node.initializer?.getText(source).includes("navigator.clipboard.writeText")) {
    callback = node.initializer.expression;
  }
  if (ts.isConditionalExpression(node) && node.condition.getText(source).includes("9gD5LvY70wZzyQjNwEVnsnnfGf62")) {
    memberLabel = node;
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(callback);
assert.ok(memberLabel);
const callbackCode = ts.transpileModule(`(${callback.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const language of ["en", "zh-TW"]) {
  const settings = JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${language}/settings.json`, import.meta.url), "utf8"));
  const i18n = i18next.createInstance();
  await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: { settings } }, defaultNS: "settings" });

  for (const outcome of ["success", "rejected", "unavailable"]) {
    test(`coupon copying reports ${outcome} in ${language}`, async () => {
      const notifications = [];
      const writes = [];
      let complete;
      const navigator = outcome === "unavailable" ? {} : {
        clipboard: {
          writeText: (value) => {
            writes.push(value);
            return new Promise((resolve, reject) => {
              complete = () => outcome === "success" ? resolve() : reject(new Error("Permission denied"));
            });
          },
        },
      };
      const onClick = runInNewContext(callbackCode, {
        navigator, coupon: "MEMBER-COUPON", t: i18n.t.bind(i18n), console: { error() {} },
        toast: {
          success: (message) => notifications.push({ type: "success", message }),
          error: (message) => notifications.push({ type: "error", message }),
        },
      });
      const pending = onClick();
      if (complete) {
        assert.deepEqual(writes, ["MEMBER-COUPON"]);
        assert.deepEqual(notifications, []);
        complete();
      }
      await pending;
      const succeeded = outcome === "success";
      assert.deepEqual(notifications, [{
        type: succeeded ? "success" : "error",
        message: settings.gloryShareBadge.toast[succeeded ? "couponCopied" : "couponCopyFailed"],
      }]);
    });
  }

  test(`profile member labels resolve in ${language}`, () => {
    for (const uid of ["9gD5LvY70wZzyQjNwEVnsnnfGf62", "another-member"]) {
      const label = runInNewContext(memberLabel.getText(source), { profile: { uid }, t: i18n.t.bind(i18n) });
      assert.equal(label, settings.gloryShareBadge[uid === "another-member" ? "label" : "firstMemberLabel"]);
    }
  });
}
