"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/app/loading";
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
    },
    onSubmit: ({ value }) => {
      signInMutation.mutate({ method: "email", payload: value });
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
      toast.error(tCommon("toast.signInError"));
      console.error(msg);
    },
  });

  useEffect(() => {
    if (!signInMutation.isPending && !isAuthUserLoading && authUser) {
      router.replace("/");
    }
  }, [authUser, isAuthUserLoading, router, signInMutation.isPending]);

  if (isAuthUserLoading) return <Loading />;

  return (
    <div className="relative z-50 flex flex-col items-center justify-center font-mono gap-y-5 min-h-dvh">
      <Button
        variant="default"
        className="flex items-center shadow-lg gap-3"
        onClick={() => {
          signInMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {tCommon("nav.signinWithGoogle")}
      </Button>

      <div className="flex items-center w-full max-w-md gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{t("divider")}</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {/* Email sign in*/}
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
