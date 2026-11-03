import type Profile from "@/models/profiles";
import type { ProfileInitializationInput, ProfileInitializationResult, ProfileReadResult } from "@/models/profiles";

export type AccountPrincipal = { uid: string; displayName: string | null; email: string | null; photoURL: string | null };
export type AccountSetupState =
  | { kind: "guest" | "authenticating" }
  | { kind: "checking" | "initializing"; uid: string }
  | { kind: "ready"; uid: string; profile: Profile; created: boolean }
  | { kind: "retryable_failure"; uid: string; error: Error }
  | { kind: "conflict"; uid: string; reason: string };
export type AccountAuthenticationResult = { kind: "ready"; uid: string; profileExisted: boolean } | { kind: "setup_pending" | "ignored" };

type Dependencies = {
  currentUser: () => AccountPrincipal | null;
  initialize: (seed: ProfileInitializationInput) => Promise<ProfileInitializationResult>;
  read: (uid: string) => Promise<ProfileReadResult>;
  publish: (uid: string, result: ProfileReadResult) => void;
};

/** One session-scoped coordinator reserves authentication before any automatic profile recovery. */
export function createAccountSetupCoordinator(dependencies: Dependencies) {
  let state: AccountSetupState = { kind: "guest" };
  let generation = 0;
  let reserved = false;
  let boundUid: string | null = null;
  let seed: ProfileInitializationInput | null = null;
  let inFlight: Promise<AccountAuthenticationResult> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: AccountSetupState) => { state = next; listeners.forEach((listener) => listener()); };
  const isCurrent = (uid: string, attempt: number) => generation === attempt && dependencies.currentUser()?.uid === uid;
  const publishFailure = (uid: string, error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "profile/setup-conflict") {
      publish({ kind: "conflict", uid, reason: error.message });
    } else {
      publish({ kind: "retryable_failure", uid, error: error instanceof Error ? error : new Error("Account setup failed unexpectedly") });
    }
  };

  const observeSession = (user: AccountPrincipal | null) => {
    if (reserved && boundUid === null) return;
    if (user?.uid === boundUid) return;
    generation++;
    reserved = false;
    boundUid = user?.uid ?? null;
    seed = null;
    inFlight = null;
    publish(user ? { kind: "checking", uid: user.uid } : { kind: "guest" });
  };

  const run = (user: AccountPrincipal, attempt: number, work: () => Promise<AccountAuthenticationResult>): Promise<AccountAuthenticationResult> => {
    if (inFlight) return inFlight;
    const task = Promise.resolve().then(async (): Promise<AccountAuthenticationResult> => {
      try {
        if (!isCurrent(user.uid, attempt)) return { kind: "ignored" };
        return await work();
      } catch (error) {
        if (!isCurrent(user.uid, attempt)) return { kind: "ignored" };
        publishFailure(user.uid, error);
        return { kind: "setup_pending" };
      } finally {
        if (generation === attempt) { inFlight = null; reserved = false; }
      }
    });
    inFlight = task;
    return task;
  };

  const initializeProfile = async (user: AccountPrincipal, attempt: number): Promise<AccountAuthenticationResult> => {
    const safeSeed = seed ?? { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
    seed = safeSeed;
    publish({ kind: "initializing", uid: user.uid });
    const result = await dependencies.initialize(safeSeed);
    if (!isCurrent(user.uid, attempt)) return { kind: "ignored" };
    if (result.kind === "conflict") {
      publish({ kind: "conflict", uid: user.uid, reason: result.reason });
      return { kind: "setup_pending" };
    }
    const read = await dependencies.read(user.uid);
    if (!isCurrent(user.uid, attempt)) return { kind: "ignored" };
    if (read.kind === "conflict") {
      publish({ kind: "conflict", uid: user.uid, reason: read.reason });
      return { kind: "setup_pending" };
    }
    if (read.kind !== "found") throw new Error("Initialized profile is missing after commit");
    dependencies.publish(user.uid, read);
    seed = null;
    publish({ kind: "ready", uid: user.uid, profile: read.profile, created: result.kind === "created" });
    return { kind: "ready", uid: user.uid, profileExisted: result.kind === "existing" };
  };
  const initialize = (user: AccountPrincipal, attempt: number) => run(user, attempt, () => initializeProfile(user, attempt));

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    observeSession,
    acceptRead(uid: string, result: ProfileReadResult | undefined, error: Error | null) {
      if (reserved || inFlight || dependencies.currentUser()?.uid !== uid) return;
      if (error) { publishFailure(uid, error); return; }
      if (!result) return;
      if (result.kind === "conflict") { publish({ kind: "conflict", uid, reason: result.reason }); return; }
      if (result.kind === "found") {
        const created = state.kind === "ready" && state.uid === uid && state.created;
        publish({ kind: "ready", uid, profile: result.profile, created });
      } else if (state.kind !== "retryable_failure" && state.kind !== "conflict") {
        const user = dependencies.currentUser();
        if (user) void initialize(user, generation);
      }
    },
    async authenticate(provider: () => Promise<{ user: AccountPrincipal }>, displayName?: string): Promise<AccountAuthenticationResult> {
      if (reserved || inFlight || dependencies.currentUser()) return { kind: "ignored" };
      const attempt = ++generation;
      reserved = true;
      boundUid = null;
      seed = null;
      publish({ kind: "authenticating" });
      try {
        const { user } = await provider();
        if (!isCurrent(user.uid, attempt)) return { kind: "ignored" };
        boundUid = user.uid;
        seed = { uid: user.uid, displayName: displayName ?? user.displayName, email: user.email, photoURL: user.photoURL };
        return await initialize(user, attempt);
      } catch (error) {
        if (generation === attempt) {
          const user = dependencies.currentUser();
          reserved = false;
          if (user) {
            boundUid = user.uid;
            seed = { uid: user.uid, displayName: displayName ?? user.displayName, email: user.email, photoURL: user.photoURL };
            publishFailure(user.uid, error);
            return { kind: "setup_pending" };
          }
          observeSession(null);
        }
        throw error;
      } finally {
        if (generation === attempt) { reserved = false; observeSession(dependencies.currentUser()); }
      }
    },
    retry(): Promise<AccountAuthenticationResult> {
      const user = dependencies.currentUser();
      if (!user || user.uid !== boundUid) { observeSession(user); return Promise.resolve({ kind: "ignored" }); }
      if (state.kind === "conflict") return Promise.resolve({ kind: "setup_pending" });
      if (seed || inFlight) return initialize(user, generation);
      const attempt = generation;
      reserved = true;
      publish({ kind: "checking", uid: user.uid });
      return run(user, attempt, async () => {
        const read = await dependencies.read(user.uid);
        if (!isCurrent(user.uid, attempt)) return { kind: "ignored" };
        if (read.kind === "missing") return initializeProfile(user, attempt);
        dependencies.publish(user.uid, read);
        if (read.kind === "conflict") {
          publish({ kind: "conflict", uid: user.uid, reason: read.reason });
          return { kind: "setup_pending" };
        }
        publish({ kind: "ready", uid: user.uid, profile: read.profile, created: false });
        return { kind: "ready", uid: user.uid, profileExisted: true };
      });
    },
  };
}
