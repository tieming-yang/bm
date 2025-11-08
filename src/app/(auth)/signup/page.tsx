"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/app/loading";
import Auth, { AuthMethod, EmailSignUpInput } from "@/models/auth";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Profile from "@/models/profiles";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

  if (isAuthUserLoading) return <Loading />;

  const signUpMutation = useMutation({
    mutationKey: QueryKey.signUp,
    mutationFn: ({ method, payload }: { method: AuthMethod; payload?: EmailSignUpInput }) => {
      if (method === "google") return Auth.signInWithGoogle();
      if (method === "email") {
        if (!payload) throw new Error("Email sign-up requires credentials");
        return Auth.signUpWithEmail(payload);
      }
      throw new Error(`Unsupported method: ${method}`);
    },
    retry: 0,
    onSuccess: async (user) => {
      if (!user) {
        throw new Error("User sign up failed");
      }
      query.setQueryData(QueryKey.authUser, user);

      console.info("Sign up success", user);
      const { uid } = user;
      await query.fetchQuery({
        queryKey: QueryKey.profile(uid),
        queryFn: () => Profile.get(uid),
        staleTime: 0,
        retry: 2,
      });

      router.replace(`/profile/${uid}`);
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error(t("toast.signUpError"));
    },
  });

  return (
    <div className="flex font-mono flex-col items-center justify-center gap-y-5 min-h-dvh relative z-50">
      <Button
        variant="outline"
        className="flex items-center shadow-lg gap-3"
        disabled={!acceptTerms}
        onClick={() => {
          signUpMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {t("nav.signupWithGoogle")}
      </Button>

      <div className="flex items-center gap-1 flex-row">
        <Checkbox
          id="terms"
          className="size-5"
          checked={acceptTerms}
          onCheckedChange={() => setAcceptTerms((prev) => !prev)}
        />
        <Label htmlFor="terms" />

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
