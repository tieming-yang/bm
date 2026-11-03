"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading, { ActionSpinner } from "@/app/loading";
import Auth, { AuthMethod, EmailSignUpInput, EmailSignUpSchema } from "@/models/auth";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useMutation } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { useAccountSetup } from "@/providers/account-setup-provider";
import { AccountSetupFeedback } from "@/components/account-setup-feedback";
import { getAuthReturnPath } from "@/lib/account/redirect";
import { isARAuthoringPath } from "@/lib/ui/ar-authoring";
import { assertIsDefined } from "@/lib/utils";
import { useAppForm } from "@/hooks/use-app-form";

type Props = {};
export default function SignUpClientPage({}: Props) {
  const router = useRouter();
  const account = useAccountSetup();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t } = useTranslation("sign-up");
  const { t: tCommon } = useTranslation("common");
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? `/`;
  const prefillEmail = params.get("prefillEmail") ?? "";
  const navigatedTo = useRef<string | null>(null);
  const navigate = useCallback((target: string) => {
    if (navigatedTo.current === target) return;
    navigatedTo.current = target;
    if (isARAuthoringPath(target.split(/[?#]/)[0])) window.location.replace(target);
    else router.replace(target);
  }, [router]);

  const signInParams = new URLSearchParams({
    redirectTo,
  });
  if (prefillEmail) {
    signInParams.set("prefillEmail", prefillEmail);
  }
  const signInHref = `/signin?${signInParams.toString()}`;

  const defaultEmailSignUpInputs: EmailSignUpInput = {
    email: prefillEmail,
    password: "",
    displayName: "",
  };

  const form = useAppForm({
    defaultValues: defaultEmailSignUpInputs,
    validators: {
      onBlur: EmailSignUpSchema,
      onSubmit: EmailSignUpSchema,
    },
    onSubmit: async ({ value }) => {
      if (signUpMutation.isPending) return;
      try {
        await signUpMutation.mutateAsync({ method: "email", payload: value });
      } catch {
        // The mutation retains the error for the form to display.
      }
    },
  });

  const signUpMutation = useMutation({
    mutationKey: QueryKey.signUp,
    mutationFn: ({ method, payload }: { method: AuthMethod; payload?: EmailSignUpInput }) => {
      if (method === "google") return account.authenticate(() => Auth.signInWithGoogle());
      if (method === "email" && payload) {
        assertIsDefined(payload.email, "Email is undefine");
        assertIsDefined(payload.password, "Password is undefine");
        assertIsDefined(payload.displayName, "Display Name is undefine");
        return account.authenticate(() => Auth.signUpWithEmail(payload), payload.displayName);
      }
      throw new Error(`Unsupported method: ${method}`);
    },
    retry: 0,
    onSuccess: (result) => {
      if (result.kind !== "ready") return;
      const target = getAuthReturnPath(redirectTo, "/");
      navigate(target);
    },
    onError: (err: unknown) => {
      console.error("Sign-up failed", { errorType: err instanceof Error ? err.name : "UnknownError" });
    },
  });

  useEffect(() => {
    if (!authUser || isAuthUserLoading || signUpMutation.isPending || account.state.kind !== "ready") return;
    const target = getAuthReturnPath(redirectTo, "/");
    navigate(target);
  }, [authUser, isAuthUserLoading, signUpMutation.isPending, account.state.kind, redirectTo, navigate]);

  if (isAuthUserLoading) return <Loading />;
  if (authUser && account.state.kind !== "ready") return <AccountSetupFeedback />;

  return (
    <div className="relative z-50 flex flex-col items-center justify-center px-5 md:px-0 gap-y-5 min-h-[70dvh] py-8">
      <Button
        variant="default"
        className="flex w-full max-w-md items-center shadow-lg gap-3"
        disabled={signUpMutation.isPending}
        aria-busy={signUpMutation.isPending}
        onClick={() => {
          signUpMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        {signUpMutation.isPending && signUpMutation.variables?.method === AuthMethod.Google ? (
          <ActionSpinner />
        ) : (
          <FcGoogle className="w-6 h-6" aria-hidden="true" />
        )}
        {tCommon("nav.signupWithGoogle")}
      </Button>

      <div className="flex items-center w-full max-w-md gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("divider")}</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {/* Email sign up */}
      <form
        className="w-full max-w-md py-6 border rounded-3xl px-5 sm:px-7 bg-card"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          void form.handleSubmit();
        }}
      >
        <h1 className="text-3xl">{t("formTitle")}</h1>
        <div className="flex flex-col py-5 gap-y-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("labels.email")}</Label>
            <form.AppField
              name="email"
              children={(field) => (
                <>
                  <field.Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0)}
                    aria-describedby={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) ? "email-error" : undefined}
                    disabled={signUpMutation.isPending}
                    value={field.state.value}
                    onChange={(e) => {
                      const hadError = !field.state.meta.isValid;
                      field.handleChange(e.target.value);
                      if (hadError) void field.validate("blur");
                    }}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) && (
                    <p id="email-error" className="text-sm text-error" role="alert">
                      {t("errors.email")}
                    </p>
                  )}
                </>
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("labels.password")}</Label>
            <form.AppField
              name="password"
              children={(field) => (
                <>
                  <field.Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0)}
                    aria-describedby={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) ? "password-error" : undefined}
                    disabled={signUpMutation.isPending}
                    value={field.state.value}
                    onChange={(e) => {
                      const hadError = !field.state.meta.isValid;
                      field.handleChange(e.target.value);
                      if (hadError) void field.validate("blur");
                    }}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) && (
                    <p id="password-error" className="text-sm text-error" role="alert">
                      {t("errors.password")}
                    </p>
                  )}
                </>
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">{t("labels.displayName")}</Label>
            <form.AppField
              name="displayName"
              children={(field) => (
                <>
                  <field.Input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    aria-invalid={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0)}
                    aria-describedby={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) ? "displayName-error" : undefined}
                    disabled={signUpMutation.isPending}
                    value={field.state.value}
                    onChange={(e) => {
                      const hadError = !field.state.meta.isValid;
                      field.handleChange(e.target.value);
                      if (hadError) void field.validate("blur");
                    }}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) && (
                    <p id="displayName-error" className="text-sm text-error" role="alert">
                      {t("errors.displayName")}
                    </p>
                  )}
                </>
              )}
            />
          </div>
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button className="w-full gap-2" type="submit" disabled={isSubmitting || signUpMutation.isPending} aria-busy={isSubmitting || signUpMutation.isPending}>
                {(isSubmitting || signUpMutation.isPending) && <ActionSpinner />}
                {isSubmitting || signUpMutation.isPending ? t("actions.processing") : t("actions.submit")}
              </Button>
            )}
          />
        </div>
      </form>

      {signUpMutation.isError && (
        <p className="w-full max-w-md text-sm text-error" role="alert">{tCommon("toast.signUpError")}</p>
      )}

      <p className="text-sm text-muted-foreground">
        {tCommon("auth.haveAccount")}{" "}
        <Link href={signInHref} className="text-xl underline text-primary underline-offset-5">
          {tCommon("auth.goToSignin")}
        </Link>
      </p>

      {/* Consents */}
      <div className="flex flex-row items-center gap-1">
        {/* <Checkbox
          id="terms"
          className="size-5"
          checked={acceptTerms}
          onCheckedChange={() => setAcceptTerms((prev) => !prev)}
        />
        <Label htmlFor="terms" /> */}

        <span>
          {tCommon("auth.consentPrefix")}{" "}
          <Link href="/terms-of-service" className="underline text-primary">
            {tCommon("auth.consentLink")}
          </Link>{" "}
          {tCommon("auth.consentSuffix")}
        </span>
      </div>
    </div>
  );
}
