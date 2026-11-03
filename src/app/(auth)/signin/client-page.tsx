"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading, { ActionSpinner } from "@/app/loading";
import Auth, { AuthMethod, EmailSignInInput, EmailSignInSchema } from "@/models/auth";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Link from "next/link";
import { useAppForm } from "@/hooks/use-app-form";
import { assertIsDefined } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type Props = {};
const REGISTRATION_ROUTE_PREFIX = "/school/summer/2026/registration";

function appendRegistrationAuthFlow(redirectTo: string, authFlow: "signin" | "signup") {
  if (!redirectTo.startsWith(REGISTRATION_ROUTE_PREFIX)) return redirectTo;

  const url = new URL(redirectTo, window.location.origin);
  url.searchParams.set("authFlow", authFlow);

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function SignInClientPage({}: Props) {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t } = useTranslation("sign-in");
  const { t: tCommon } = useTranslation("common");
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");
  const prefillEmail = params.get("prefillEmail") ?? "";
  const query = useQueryClient();

  const signUpParams = new URLSearchParams();
  if (redirectTo) {
    signUpParams.set("redirectTo", redirectTo);
  }
  if (prefillEmail) {
    signUpParams.set("prefillEmail", prefillEmail);
  }
  const signUpHref = signUpParams.toString() ? `/signup?${signUpParams.toString()}` : "/signup";

  const defaultEmailSignInInputs: EmailSignInInput = {
    email: prefillEmail,
    password: "",
  };

  const form = useAppForm({
    defaultValues: defaultEmailSignInInputs,
    validators: {
      onBlur: EmailSignInSchema,
      onSubmit: EmailSignInSchema,
    },
    onSubmit: async ({ value }) => {
      if (signInMutation.isPending) return;
      try {
        await signInMutation.mutateAsync({ method: "email", payload: value });
      } catch {
        // The mutation retains the error for the form to display.
      }
    },
  });

  //TODO: since there is no sign up with goolge, we choose simplify the process by sign up and sign in at same time, separate the logic when add different sign in mathod
  const signInMutation = useMutation({
    mutationKey: QueryKey.signUp,
    mutationFn: ({ method, payload }: { method: AuthMethod; payload?: EmailSignInInput }) => {
      if (method === "google") return Auth.signInWithGoogle();
      if (method === "email" && payload) {
        assertIsDefined(payload.email, "Email is undefine");
        assertIsDefined(payload.password, "Password is undefine");

        return Auth.signInWithEmail(payload);
      }
      throw new Error(`Unsupported method: ${method}`);
    },
    retry: 0,
    onSuccess: async ({ user }) => {
      if (!user) {
        throw new Error("User sign up failed");
      }
      query.setQueryData(QueryKey.authUser, user);

      console.info("Sign up success", user);
      const { uid } = user;
      toast.success(tCommon("toast.signInSuccess"));

      const goTo = redirectTo ?? `/profile/${uid}`;
      router.replace(appendRegistrationAuthFlow(goTo, "signin"));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      console.error(msg);
    },
  });

  useEffect(() => {
    if (!signInMutation.isPending && !signInMutation.isSuccess && !isAuthUserLoading && authUser) {
      router.replace("/");
    }
  }, [authUser, isAuthUserLoading, router, signInMutation.isPending, signInMutation.isSuccess]);

  if (isAuthUserLoading) return <Loading />;

  return (
    <div className="relative z-50 flex flex-col items-center justify-center px-4 gap-y-5 min-h-[70dvh] py-8">
      <Button
        variant="default"
        className="flex w-full max-w-md items-center shadow-lg gap-3"
        disabled={signInMutation.isPending}
        aria-busy={signInMutation.isPending}
        onClick={() => {
          signInMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        {signInMutation.isPending && signInMutation.variables?.method === AuthMethod.Google ? (
          <ActionSpinner />
        ) : (
          <FcGoogle className="w-6 h-6" aria-hidden="true" />
        )}
        {tCommon("nav.signinWithGoogle")}
      </Button>

      <div className="flex items-center w-full max-w-md gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("divider")}</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {/* Email sign in*/}
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
                    disabled={signInMutation.isPending}
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
                    autoComplete="current-password"
                    aria-invalid={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0)}
                    aria-describedby={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) ? "password-error" : undefined}
                    disabled={signInMutation.isPending}
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

          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button className="w-full gap-2" type="submit" disabled={isSubmitting || signInMutation.isPending} aria-busy={isSubmitting || signInMutation.isPending}>
                {(isSubmitting || signInMutation.isPending) && <ActionSpinner />}
                {isSubmitting || signInMutation.isPending ? t("actions.processing") : t("actions.submit")}
              </Button>
            )}
          />
        </div>
      </form>

      {signInMutation.isError && (
        <p className="w-full max-w-md text-sm text-error" role="alert">{tCommon("toast.signInError")}</p>
      )}

      <p className="text-sm text-muted-foreground">
        {tCommon("auth.noAccount")}{" "}
        <Link href={signUpHref} className="text-xl underline text-primary underline-offset-5">
          {tCommon("auth.goToSignup")}{" "}
        </Link>
      </p>
      <p className="font-sans text-xl font-bold">{tCommon("auth.signupSuffix")}</p>

      <div className="flex flex-row items-center px-10 text-xs md:px-0 text-wrap gap-1">
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
