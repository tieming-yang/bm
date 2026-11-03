"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendEmailVerification, type User } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import Auth from "@/models/auth";
import firebase from "@/lib/firebase/firebase";
import { QueryKey } from "@/utils/query-keys";
import {
  createMembershipClaimPath,
  getMembershipClaimRecovery,
  requestMembershipClaim,
} from "@/lib/membership/client";
import type { MembershipClaimResult } from "@/lib/membership/contracts";

type ClaimState =
  | { kind: "idle" }
  | { kind: "busy"; action: "activate" | "sendVerification" | "refreshVerification" | "signOut" }
  | { kind: "notice"; message: "verificationSent" | "verificationFailed" | "verificationStillNeeded" | "verificationReady" | "refreshFailed" | "signOutFailed" }
  | { kind: "result"; result: MembershipClaimResult };

function SignedInClaim({ user, sessionId }: { user: User; sessionId: string }) {
  const { t, currentLanguage } = useTranslation("membership-claim");
  const query = useQueryClient();
  const [state, setState] = useState<ClaimState>({ kind: "idle" });
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const locked = useRef(false);
  const mounted = useRef(true);
  const claimRequest = useRef<AbortController | null>(null);
  const claimPath = createMembershipClaimPath(sessionId);
  const result = state.kind === "result" ? state.result : null;
  const recovery = result ? getMembershipClaimRecovery(result.kind) : null;
  const busy = state.kind === "busy";
  const needsVerification = !emailVerified;
  const complete = recovery === "complete";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      claimRequest.current?.abort();
    };
  }, []);

  const activate = async () => {
    if (locked.current || needsVerification) return;
    locked.current = true;
    const controller = new AbortController();
    claimRequest.current = controller;
    setState({ kind: "busy", action: "activate" });
    try {
      const token = await user.getIdToken(true);
      controller.signal.throwIfAborted();
      if (Auth.user?.uid !== user.uid) throw new Error("Membership claim account changed");
      const outcome = await requestMembershipClaim(sessionId, token, fetch, controller.signal);
      if (!mounted.current) return;
      if (outcome.kind === "email_verification_required") setEmailVerified(false);
      setState({ kind: "result", result: outcome });
      if (outcome.kind === "claimed" || outcome.kind === "already_claimed") {
        void query.invalidateQueries({ queryKey: QueryKey.profile(user.uid) });
      }
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : "";
      setState({ kind: "result", result: {
        kind: code === "auth/user-token-expired" || code === "auth/invalid-user-token" || code === "auth/user-disabled"
          ? "authentication_required" : "retryable_failure",
      } });
    } finally {
      locked.current = false;
      if (claimRequest.current === controller) claimRequest.current = null;
    }
  };

  const sendVerification = async () => {
    if (locked.current) return;
    locked.current = true;
    setState({ kind: "busy", action: "sendVerification" });
    try {
      firebase.auth.languageCode = currentLanguage?.toLowerCase().startsWith("en") ? "en" : "zh-TW";
      await sendEmailVerification(user, { url: new URL(claimPath, window.location.origin).href });
      if (mounted.current) setState({ kind: "notice", message: "verificationSent" });
    } catch {
      if (mounted.current) setState({ kind: "notice", message: "verificationFailed" });
    } finally {
      locked.current = false;
    }
  };

  const refreshVerification = async () => {
    if (locked.current) return;
    locked.current = true;
    setState({ kind: "busy", action: "refreshVerification" });
    try {
      await user.reload();
      await user.getIdToken(true);
      if (!mounted.current) return;
      setEmailVerified(user.emailVerified);
      query.setQueryData(QueryKey.authUser, user);
      setState({ kind: "notice", message: user.emailVerified ? "verificationReady" : "verificationStillNeeded" });
    } catch {
      if (mounted.current) setState({ kind: "notice", message: "refreshFailed" });
    } finally {
      locked.current = false;
    }
  };

  const signOut = async () => {
    if (locked.current) return;
    locked.current = true;
    setState({ kind: "busy", action: "signOut" });
    try {
      await Auth.signOut();
    } catch {
      if (mounted.current) setState({ kind: "notice", message: "signOutFailed" });
    } finally {
      locked.current = false;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="break-words text-sm text-muted-foreground">{t("signedInAs", { email: user.email ?? "" })}</p>
      <div role="status" aria-live="polite" className="text-base leading-relaxed">
        {state.kind === "busy" ? <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t(`working.${state.action}`)}</p>
          : state.kind === "notice" ? t(state.message)
          : result ? t(`outcomes.${result.kind}`)
          : t(needsVerification ? "verifyExplanation" : "readyExplanation")}
      </div>
      {complete ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href={`/profile/${user.uid}`}>{t("viewMembership")}</Link></Button>
          <Button asChild variant="outline"><Link href="/bible-gallery">{t("exploreGallery")}</Link></Button>
        </div>
      ) : (
        <>
          {needsVerification ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button type="button" onClick={sendVerification} disabled={busy}>{t("sendVerification")}</Button>
              <Button type="button" variant="outline" onClick={refreshVerification} disabled={busy}>{t("refreshVerification")}</Button>
            </div>
          ) : recovery === "account" ? (
            <Button asChild><Link href={`/profile/${user.uid}`}>{t("viewMembership")}</Link></Button>
          ) : recovery === "contact" ? (
            <Button asChild><Link href="/contact">{t("contactSupport")}</Link></Button>
          ) : recovery !== "sign-in" ? (
            <Button type="button" onClick={activate} disabled={busy} aria-busy={state.kind === "busy" && state.action === "activate"}>
              {t(recovery === "retry" ? "retryActivation" : "activate")}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={signOut} disabled={busy} className="self-start whitespace-normal text-left">{t("useAnotherAccount")}</Button>
          {recovery !== "contact" && <Link href="/contact" className="text-sm underline underline-offset-4">{t("contactSupport")}</Link>}
        </>
      )}
    </div>
  );
}

export default function MembershipClaim({ sessionId }: { sessionId: string | null }) {
  const { t } = useTranslation("membership-claim");
  const { authUser, isAuthUserLoading } = useAuthUser();
  const claimPath = sessionId ? createMembershipClaimPath(sessionId) : null;
  const authQuery = claimPath ? new URLSearchParams({ redirectTo: claimPath }).toString() : "";

  return (
    <section className="mx-auto flex min-h-[65dvh] w-full max-w-2xl flex-col justify-center px-5 py-12 sm:py-20" aria-labelledby="membership-claim-title">
      <div className="flex flex-col gap-6 rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{t("eyebrow")}</p>
          <h1 id="membership-claim-title" className="text-3xl leading-tight sm:text-4xl">{t("title")}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{t("intro")}</p>
        </div>
        {!sessionId ? (
          <div className="space-y-4"><p role="alert">{t("invalidLink")}</p><Link href="/contact" className="underline underline-offset-4">{t("contactSupport")}</Link></div>
        ) : isAuthUserLoading ? (
          <p role="status" className="flex items-center gap-2"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t("loadingAccount")}</p>
        ) : authUser ? (
          <SignedInClaim key={`${sessionId}/${authUser.uid}`} user={authUser} sessionId={sessionId} />
        ) : (
          <div className="space-y-4">
            <p>{t("signInExplanation")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link href={`/signin?${authQuery}`}>{t("signIn")}</Link></Button>
              <Button asChild variant="outline"><Link href={`/signup?${authQuery}`}>{t("signUp")}</Link></Button>
            </div>
          </div>
        )}
        <Link href="/daily-blessing" className="text-sm text-muted-foreground underline underline-offset-4">{t("backToBlessing")}</Link>
      </div>
    </section>
  );
}
