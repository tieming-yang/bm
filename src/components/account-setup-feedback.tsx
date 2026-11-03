"use client";

import { Button } from "@/components/ui/button";
import { ActionSpinner } from "@/app/loading";
import useTranslation from "@/hooks/use-translation";
import { useAccountSetup } from "@/providers/account-setup-provider";

/** Account credentials remain valid while profile setup is retried separately. */
export function AccountSetupFeedback() {
  const { state, retry } = useAccountSetup();
  const { t } = useTranslation("sign-in");
  const busy = state.kind === "checking" || state.kind === "initializing" || state.kind === "authenticating";
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-3xl border bg-card p-6" role={busy ? "status" : "alert"}>
      <h1 className="text-3xl">{t(busy ? "setup.title" : state.kind === "conflict" ? "setup.conflictTitle" : "setup.failedTitle")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t(busy ? "setup.description" : state.kind === "conflict" ? "setup.conflictDescription" : "setup.failedDescription")}</p>
      {busy ? <ActionSpinner /> : state.kind === "retryable_failure" ? <Button type="button" onClick={() => { void retry(); }}>{t("setup.retry")}</Button> : null}
      {!busy && <a href="mailto:beyonddigitalmedia.art@gmail.com" className="text-sm text-primary underline underline-offset-4">{t("setup.support")}</a>}
    </section>
  );
}
