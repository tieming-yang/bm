import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";
const { getAuthReturnPath } = loadSourceModule("src/lib/account/redirect.ts");
function authWithReset(send) {
  const auth = {};
  return { auth, Auth: loadSourceModule("src/models/auth.ts", {
    "firebase/auth": { sendPasswordResetEmail: send }, "../lib/firebase/firebase": { auth }, "@/lib/utils": {},
  }).default };
}
for (const code of [null, "auth/user-not-found", "auth/too-many-requests", "auth/network-request-failed"]) {
  test(`password reset handles ${code ?? "success"} without exposing account existence`, async () => {
    const h = authWithReset(async (_, email) => { assert.equal(email, "member@example.test"); if (code) throw { code }; });
    const result = await h.Auth.requestPasswordReset(" member@example.test ", "zh-TW");
    assert.equal(result.kind, code === "auth/too-many-requests" ? "rate_limited" : code === "auth/network-request-failed" ? "unavailable" : "sent");
    assert.equal(h.auth.languageCode, "zh-TW");
  });
}

test("invalid recovery input fails before sending and unexpected infrastructure failures throw", async () => {
  let sends = 0;
  const h = authWithReset(async () => { sends++; throw new Error("Unexpected provider failure"); });
  await assert.rejects(h.Auth.requestPasswordReset("invalid", "en"));
  await assert.rejects(h.Auth.requestPasswordReset("member@example.test", "unsupported"));
  assert.equal(sends, 0);
  await assert.rejects(h.Auth.requestPasswordReset("member@example.test", "en"), /Unexpected provider failure/);
});

test("signin accepts existing shorter credentials while signup retains its password policy", async () => {
  const calls = [];
  const { default: Auth } = loadSourceModule("src/models/auth.ts", {
    "firebase/auth": {
      signInWithEmailAndPassword: async (_, email, password) => { calls.push({ email, password }); return { user: { uid: "owner" } }; },
      createUserWithEmailAndPassword: async () => { throw new Error("Signup must reject before the provider"); },
    },
    "../lib/firebase/firebase": { auth: {} },
  });
  await Auth.signInWithEmail({ email: "owner@example.test", password: "short" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].password, "short");
  await assert.rejects(Auth.signInWithEmail({ email: "owner@example.test", password: "" }));
  await assert.rejects(Auth.signUpWithEmail({ email: "owner@example.test", password: "short", displayName: "Member" }));
  assert.equal(calls.length, 1);
});

test("account return paths retain query context but cannot navigate externally or reopen registration", () => {
  for (const value of ["https://evil.test", "//evil.test", "javascript:alert(1)", "/\\evil.test", "/signin?redirectTo=/signup"]) assert.equal(getAuthReturnPath(value, "/"), "/");
  assert.equal(getAuthReturnPath("/glory-share/claim?session_id=cs_test#help", "/"), "/glory-share/claim?session_id=cs_test#help");
  assert.equal(getAuthReturnPath("/dashboard/ar/edit?id=collection", "/"), "/dashboard/ar/edit?id=collection");
  assert.equal(getAuthReturnPath("/school/summer/2026/registration?authFlow=signup", "/"), "/school");
});
