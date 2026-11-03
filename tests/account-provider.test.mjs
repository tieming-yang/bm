import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceModule } from "./helpers/source-module.mjs";

function providerValue({ authUser, state = { kind: "guest" }, loading = false }) {
  const { AccountSetupProvider } = loadSourceModule("src/providers/account-setup-provider.tsx", {
    react: {
      createContext: () => ({ Provider: "Context" }), useContext: () => null, useEffect() {},
      useState: (initialize) => [initialize()], useSyncExternalStore: (_, snapshot) => snapshot(),
    },
    "@tanstack/react-query": { useQueryClient: () => ({}), useQuery: () => ({ isFetched: false, error: null, refetch() {} }) },
    "@/models/auth": {}, "@/models/profiles": {},
    "@/hooks/use-auth-user": () => ({ authUser, isAuthUserLoading: loading }),
    "@/utils/query-keys": { QueryKey: { profile: (uid) => ["profile", uid] } },
    "@/lib/account/setup": { createAccountSetupCoordinator: () => ({ getSnapshot: () => state, subscribe() {} }) },
  });
  return AccountSetupProvider({ children: null }).props.value;
}

test("a persisted authenticated session starts as loading before session effects run", () => {
  const value = providerValue({ authUser: { uid: "owner" } });
  assert.equal(value.state.kind, "checking");
  assert.equal(value.isProfileLoading, true);
  assert.equal(value.profile, undefined);
});

test("an account switch hides the previous profile before coordinator effects run", () => {
  const value = providerValue({ authUser: { uid: "other" }, state: { kind: "ready", uid: "owner", profile: { uid: "owner" }, created: false } });
  assert.equal(value.state.kind, "checking");
  assert.equal(value.state.uid, "other");
  assert.equal(value.isProfileLoading, true);
  assert.equal(value.profile, undefined);
});

test("a signed-out render cannot expose an earlier ready profile", () => {
  const value = providerValue({ authUser: null, state: { kind: "ready", uid: "owner", profile: { uid: "owner" }, created: false } });
  assert.equal(value.state.kind, "guest");
  assert.equal(value.profile, undefined);
});
