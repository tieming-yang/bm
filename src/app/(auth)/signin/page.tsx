"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Loading from "@/app/loading";
import Auth, { AuthMethod, EmailSignInInput } from "@/models/auth";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Profile from "@/models/profiles";
import Link from "next/link";

type Props = {};
export default function SignInPage({}: Props) {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t, currentLanguage } = useTranslation();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo");
  const query = useQueryClient();
  console.log({ redirectTo });
  if (isAuthUserLoading) return <Loading />;

  //TODO: since there is no sign up with goolge, we choose simplify the process by sign up and sign in at same time, separate the logic when add different sign in mathod
  const signInMutation = useMutation({
    mutationKey: QueryKey.signUp,
    mutationFn: ({ method, payload }: { method: AuthMethod; payload?: EmailSignInInput }) => {
      if (method === "google") return Auth.signInWithGoogle();
      if (method === "email") {
        if (!payload) throw new Error("Email sign-up requires credentials");
        return Auth.signInWithEmail(payload);
      }
      throw new Error(`Unsupported method: ${method}`);
    },
    retry: 0,
    onSuccess: async (user) => {
      if (!user) {
        throw new Error("User sign up failed");
      }
      query.setQueryData(["auth", "user"], user);

      console.info("Sign up success", user);
      const { uid } = user;
      await query.fetchQuery({
        queryKey: QueryKey.profile(uid),
        queryFn: () => Profile.get(uid),
        staleTime: 0,
        retry: 2,
      });

      toast.success(t("toast.signInSuccess"));

      const goTo = redirectTo ?? `/profile/${uid}`;
      router.replace(goTo);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      console.error(msg);
    },
  });

  return (
    <div className="relative z-50 flex flex-col items-center justify-center font-mono gap-y-5 min-h-dvh">
      <Button
        variant="outline"
        className="flex items-center shadow-lg gap-3"
        onClick={() => {
          signInMutation.mutate({ method: AuthMethod.Google });
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {t("nav.signinWithGoogle")}
      </Button>

      {/* <p className="text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="text-xl underline text-primary underline-offset-5">
          {t("auth.goToSignup")}{" "}
        </Link>
      </p> */}
      <p className="font-sans text-xl font-bold">{t("auth.signupSuffix")}</p>

      <div className="flex flex-row items-center text-xs gap-1">
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
