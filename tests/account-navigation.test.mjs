import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";
const { getAuthReturnPath } = loadSourceModule("src/lib/account/redirect.ts");
const { isARAuthoringPath } = loadSourceModule("src/lib/ui/ar-authoring.ts");

function authPage(route, destination) {
  const mutations = [];
  const effects = [];
  const navigations = [];
  const { default: Page } = loadSourceModule(`src/app/(auth)/${route}/client-page.tsx`, {
    react: { useCallback: (callback) => callback, useEffect: (effect) => effects.push(effect), useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/label": { Label: "label" },
    "next/navigation": { useRouter: () => ({ replace: (target) => navigations.push(["router", target]) }), useSearchParams: () => new URLSearchParams({ redirectTo: destination }) },
    "@/app/loading": { default: "loading", ActionSpinner: "spinner" },
    "@/models/auth": { AuthMethod: { Google: "google" } },
    "@/hooks/use-auth-user": () => ({ authUser: { uid: "owner" }, isAuthUserLoading: false }),
    "@/hooks/use-translation": () => ({ t: (key) => key }),
    sonner: { toast: { success() {} } }, "react-icons/fc": { FcGoogle: "google" },
    "@tanstack/react-query": { useMutation: (options) => { mutations.push(options); return { isPending: false }; } },
    "@/utils/query-keys": { QueryKey: { signUp: [] } }, "next/link": "a",
    "@/hooks/use-app-form": { useAppForm: () => ({ AppField: "field", Subscribe: "subscribe", state: { values: { email: "" } } }) },
    "@/providers/account-setup-provider": { useAccountSetup: () => ({ state: { kind: "ready" } }) },
    "@/components/account-setup-feedback": { AccountSetupFeedback: "feedback" },
    "@/components/password-reset-dialog": { PasswordResetDialog: "reset" },
    "@/lib/account/redirect": { getAuthReturnPath }, "@/lib/ui/ar-authoring": { isARAuthoringPath },
    "@/lib/utils": {},
  });
  const priorWindow = globalThis.window;
  globalThis.window = { location: { replace: (target) => navigations.push(["document", target]) } };
  Page({});
  return { mutations, effects, navigations, restore: () => { globalThis.window = priorWindow; } };
}

for (const route of ["signin", "signup"]) {
  test(`${route} does not redirect partial setup and redirects completed AR setup once across a document boundary`, () => {
    const h = authPage(route, "/dashboard/ar/edit?id=collection");
    try {
      h.mutations[0].onSuccess({ kind: "setup_pending" });
      assert.deepEqual(h.navigations, []);
      h.mutations[0].onSuccess({ kind: "ready", uid: "owner" });
      h.effects.forEach((effect) => effect());
      assert.deepEqual(h.navigations, [["document", "/dashboard/ar/edit?id=collection"]]);
    } finally { h.restore(); }
  });

  test(`${route} preserves a local claim return while rejecting external destinations`, () => {
    for (const [destination, expected] of [["/glory-share/claim?session_id=cs_test", "/glory-share/claim?session_id=cs_test"], ["//external.test", route === "signin" ? "/profile/owner" : "/"]]) {
      const h = authPage(route, destination);
      try {
        h.mutations[0].onSuccess({ kind: "ready", uid: "owner" });
        assert.deepEqual(h.navigations, [["router", expected]]);
      } finally { h.restore(); }
    }
  });
}
