import test from "node:test";
import assert from "node:assert/strict";
import { loadSourceModule } from "./helpers/source-module.mjs";

function authAdapter(signOut) {
  return loadSourceModule("src/models/auth.ts", {
    "firebase/auth": {},
    "../lib/firebase/firebase": { auth: { signOut } },
    "./profiles": {},
    "@/lib/utils": {},
  }).default;
}

test("sign-out adapter completes only after the provider resolves", async () => {
  let resolve;
  let completed = false;
  const auth = authAdapter(() => new Promise((done) => { resolve = done; }));
  const pending = auth.signOut().then(() => { completed = true; });
  assert.equal(completed, false);
  resolve();
  await pending;
  assert.equal(completed, true);
});

test("sign-out provider failure propagates instead of reporting successful sign-out", async () => {
  const failure = new Error("Provider unavailable");
  await assert.rejects(authAdapter(async () => { throw failure; }).signOut(), (error) => error === failure);
});

test("sign-out UI reports failure without navigating or emitting success", async () => {
  let pending = false;
  const messages = [];
  const navigations = [];
  const { default: SignOutButton } = loadSourceModule("src/app/(auth)/signout/signout-button.tsx", {
    react: { useState: () => [pending, (value) => { pending = value; }] },
    "@/app/loading": { ActionSpinner: "Spinner" },
    "@/components/ui/button": { Button: "button" },
    "next/navigation": { useRouter: () => ({ replace: (path) => navigations.push(path) }) },
    "@/models/auth": { signOut: async () => { throw new Error("Provider unavailable"); } },
    "@/hooks/use-translation": () => ({ t: (key) => key }),
    sonner: { toast: { success: (message) => messages.push(["success", message]), error: (message) => messages.push(["error", message]) } },
  });
  await SignOutButton({}).props.onClick();
  assert.deepEqual(messages, [["error", "toast.signOutError"]]);
  assert.deepEqual(navigations, []);
  assert.equal(pending, false);
});
