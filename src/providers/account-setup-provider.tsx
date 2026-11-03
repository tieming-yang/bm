"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Auth from "@/models/auth";
import Profile from "@/models/profiles";
import useAuthUser from "@/hooks/use-auth-user";
import { QueryKey } from "@/utils/query-keys";
import { createAccountSetupCoordinator, type AccountSetupState } from "@/lib/account/setup";

const profileReadKey = (uid: string) => [...QueryKey.profile(uid), "account-setup"] as const;
function useAccountSetupValue() {
  const query = useQueryClient();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const [coordinator] = useState(() => createAccountSetupCoordinator({
    currentUser: () => Auth.user,
    initialize: (seed) => Profile.ensureInitialized(seed),
    read: (uid) => Profile.read(uid),
    publish: (uid, result) => query.setQueryData(profileReadKey(uid), result),
  }));
  const state = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
  const uid = authUser?.uid;
  const owner = useQuery({
    queryKey: profileReadKey(uid ?? "guest"),
    queryFn: () => Profile.read(uid!),
    enabled: !!uid && !isAuthUserLoading && state.kind !== "authenticating" && state.kind !== "initializing",
    retry: false,
  });
  useEffect(() => { if (!isAuthUserLoading) coordinator.observeSession(authUser); }, [authUser, isAuthUserLoading, coordinator]);
  useEffect(() => { if (uid && !isAuthUserLoading) coordinator.acceptRead(uid, owner.data, owner.error); }, [uid, isAuthUserLoading, owner.data, owner.error, coordinator]);
  const currentState: AccountSetupState = uid && (state.kind === "guest" || ("uid" in state && state.uid !== uid)) ? { kind: "checking", uid } : !uid && state.kind !== "authenticating" ? { kind: "guest" } : state;
  const profile = currentState.kind === "ready" ? currentState.profile : undefined;
  const profileError = currentState.kind === "retryable_failure" ? currentState.error : currentState.kind === "conflict" ? new Error(currentState.reason) : owner.error;
  return {
    state: currentState,
    authenticate: coordinator.authenticate,
    retry: coordinator.retry,
    profile,
    profileError,
    isProfileLoading: isAuthUserLoading || (!!uid && ["authenticating", "checking", "initializing"].includes(currentState.kind)),
    isProfileFetched: owner.isFetched || currentState.kind === "ready" || currentState.kind === "conflict" || currentState.kind === "retryable_failure",
    refetchProfile: owner.refetch,
  };
}
const AccountSetupContext = createContext<ReturnType<typeof useAccountSetupValue> | null>(null);
export function AccountSetupProvider({ children }: React.PropsWithChildren) {
  const value = useAccountSetupValue();
  return <AccountSetupContext.Provider value={value}>{children}</AccountSetupContext.Provider>;
}
export function useAccountSetup() {
  const context = useContext(AccountSetupContext);
  if (!context) throw new Error("Account setup requires AccountSetupProvider");
  return context;
}
