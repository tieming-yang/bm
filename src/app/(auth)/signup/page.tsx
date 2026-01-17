"use client";

import { useEffect, useState } from "react";
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
export default function SignUpPage({}: Props) {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t, currentLanguage } = useTranslation();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? `/`;
  const query = useQueryClient();

  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (!isAuthUserLoading && authUser) {
      router.push(redirectTo);
    }
  }, [authUser, isAuthUserLoading, redirectTo, router]);

  const defaultEmailSignUpInputs: EmailSignUpInput = {
    email: "",
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
    onSuccess: async (user) => {
      query.setQueryData(QueryKey.authUser, user);
      const { uid } = user;
      router.replace(`/profile/${uid}`);
    },
    onError: (err: unknown) => {
      toast.error(t("toast.signUpError"));
    },
  });

  if (isAuthUserLoading) return <Loading />;

  return (
    <div className="relative z-50 px-5 md:px-0 flex flex-col items-center justify-center font-mono gap-y-5 min-h-dvh">
      <Button
        variant="default"
        className="flex items-center shadow-lg gap-3"
        onClick={() => {
          signUpMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {t("nav.signupWithGoogle")}
      </Button>

      <div className="flex w-full max-w-md items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Email sign up */}
      <form
        className="w-full max-w-md border rounded-4xl px-7 py-5 bg-card"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          void form.handleSubmit();
        }}
      >
        <h2 className="text-2xl">Email Sign up</h2>
        <div className="flex gap-y-5 flex-col py-5">
          <div className="flex gap-2 flex-col">
            <Label htmlFor="email">Email</Label>
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
          <div className="flex gap-2 flex-col">
            <Label htmlFor="password">Password</Label>
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
          <div className="flex gap-2 flex-col">
            <Label htmlFor="displayName">Display Name</Label>
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
                  {isSubmitting ? <Loading isInlined /> : "Sign up"}
                </Button>
              );
            }}
          />
        </div>
      </form>

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
          {t("auth.consentPrefix")}{" "}
          <Link href="/terms" className="underline text-primary">
            {t("auth.consentLink")}
          </Link>{" "}
          {t("auth.consentSuffix")}
        </span>
      </div>
    </div>
  );
}
