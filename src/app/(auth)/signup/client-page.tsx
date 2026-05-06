"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/app/loading";
import Auth, { AuthMethod, EmailSignUpInput, EmailSignUpSchema } from "@/models/auth";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { assertIsDefined } from "@/lib/utils";
import { useAppForm } from "@/hooks/use-app-form";

type Props = {};
const REGISTRATION_ROUTE_PREFIX = "/school/summer/2026/registration";

function appendRegistrationAuthFlow(redirectTo: string, authFlow: "signup" | "signin") {
  if (!redirectTo.startsWith(REGISTRATION_ROUTE_PREFIX)) return redirectTo;

  const url = new URL(redirectTo, window.location.origin);
  url.searchParams.set("authFlow", authFlow);

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function SignUpClientPage({}: Props) {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t } = useTranslation("sign-up");
  const { t: tCommon } = useTranslation("common");
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? `/`;
  const prefillEmail = params.get("prefillEmail") ?? "";
  const query = useQueryClient();

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
    },
    onSubmit: ({ value }) => {
      signUpMutation.mutate({ method: "email", payload: value });
    },
  });

  const signUpMutation = useMutation({
    mutationKey: QueryKey.signUp,
    mutationFn: ({ method, payload }: { method: AuthMethod; payload?: EmailSignUpInput }) => {
      if (method === "google") return Auth.signInWithGoogle();
      if (method === "email" && payload) {
        assertIsDefined(payload.email, "Email is undefine");
        assertIsDefined(payload.password, "Password is undefine");
        assertIsDefined(payload.displayName, "Display Name is undefine");
        return Auth.signUpWithEmail(payload);
      }
      throw new Error(`Unsupported method: ${method}`);
    },
    retry: 0,
    onSuccess: async ({ user, profileExisted }) => {
      query.setQueryData(QueryKey.authUser, user);
      router.replace(
        appendRegistrationAuthFlow(redirectTo, profileExisted ? "signin" : "signup")
      );
    },
    onError: (err: unknown) => {
      toast.error(tCommon("toast.signUpError"));
    },
  });

  useEffect(() => {
    if (!signUpMutation.isPending && !isAuthUserLoading && authUser) {
      router.replace("/");
    }
  }, [authUser, isAuthUserLoading, router, signUpMutation.isPending]);

  if (isAuthUserLoading) return <Loading />;

  return (
    <div className="relative z-50 flex flex-col items-center justify-center px-5 font-mono md:px-0 gap-y-5 min-h-dvh">
      <Button
        variant="default"
        className="flex items-center shadow-lg gap-3"
        onClick={() => {
          signUpMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {tCommon("nav.signupWithGoogle")}
      </Button>

      <div className="flex items-center w-full max-w-md gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("divider")}</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {/* Email sign up */}
      <form
        className="w-full max-w-md py-5 border rounded-4xl px-7 bg-card"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          void form.handleSubmit();
        }}
      >
        <h2 className="text-2xl">{t("formTitle")}</h2>
        <div className="flex flex-col py-5 gap-y-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("labels.email")}</Label>
            <form.AppField
              name="email"
              children={(field) => (
                <>
                  <field.Input
                    id="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (
                    <em className="text-red-500">
                      {field.state.meta.errorMap["onBlur"]?.at(0)?.message}
                    </em>
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
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (
                    <em className="text-red-500">
                      {field.state.meta.errorMap["onBlur"]?.at(0)?.message}
                    </em>
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
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {!field.state.meta.isValid && (
                    <em className="text-red-500">
                      {field.state.meta.errorMap["onBlur"]?.at(0)?.message}
                    </em>
                  )}
                </>
              )}
            />
          </div>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => {
              return (
                <Button className="relative" type="submit" disabled={!canSubmit}>
                  {isSubmitting ? <Loading isInlined /> : t("actions.submit")}
                </Button>
              );
            }}
          />
        </div>
      </form>

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
