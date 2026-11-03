"use client";

import { useRef, useState } from "react";
import * as v from "valibot";
import Auth, { PasswordResetInputSchema } from "@/models/auth";
import useTranslation from "@/hooks/use-translation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionSpinner } from "@/app/loading";

type ResetState = "idle" | "sending" | "sent" | "rate_limited" | "unavailable";
export function PasswordResetDialog({ open, onOpenChange, initialEmail }: { open: boolean; onOpenChange: (open: boolean) => void; initialEmail: string }) {
  const { t, currentLanguage } = useTranslation("sign-in");
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<ResetState>("idle");
  const [invalid, setInvalid] = useState(false);
  const sending = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const pending = state === "sending";
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent closeDisabled={pending} onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>{t("reset.title")}</DialogTitle><DialogDescription>{t("reset.description")}</DialogDescription></DialogHeader>
        {state === "sent" ? <><p role="status" className="text-sm">{t("reset.sent")}</p><Button type="button" onClick={() => onOpenChange(false)}>{t("reset.back")}</Button></> : <form noValidate className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (sending.current) return;
          const value = v.safeParse(PasswordResetInputSchema, { email });
          if (!value.success) { setInvalid(true); emailInput.current?.focus(); return; }
          setInvalid(false);
          sending.current = true;
          setState("sending");
          try {
            const result = await Auth.requestPasswordReset(value.output.email, currentLanguage === "en" ? "en" : "zh-TW");
            setState(result.kind);
          } catch (error) {
            console.error("Password reset request failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
            setState("unavailable");
          } finally {
            sending.current = false;
          }
        }}>
          <div className="space-y-2"><Label htmlFor="reset-email">{t("labels.email")}</Label><Input ref={emailInput} id="reset-email" type="email" autoComplete="email" value={email} disabled={pending} aria-invalid={invalid} aria-describedby={invalid ? "reset-email-error" : undefined} onBlur={() => setInvalid(!v.safeParse(PasswordResetInputSchema, { email }).success)} onChange={(event) => { setEmail(event.target.value); if (invalid) setInvalid(!v.safeParse(PasswordResetInputSchema, { email: event.target.value }).success); }} />{invalid && <p id="reset-email-error" role="alert" className="text-sm text-error">{t("errors.email")}</p>}</div>
          {(state === "rate_limited" || state === "unavailable") && <p role="alert" className="text-sm text-error">{t(`reset.${state}`)}</p>}
          <Button className="w-full" type="submit" disabled={pending} aria-busy={pending}>{pending && <ActionSpinner />}{t(pending ? "reset.sending" : "reset.submit")}</Button>
          <Button className="w-full" type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>{t("reset.cancel")}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
