"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/models/auth";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

type Props = {};
export default function SignInPage({}: Props) {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t, currentLanguage } = useTranslation();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? `/profile/${authUser?.uid}`;

  useEffect(() => {
    if (!isAuthUserLoading && authUser) {
      router.push(redirectTo);
    }
  }, [authUser, isAuthUserLoading, redirectTo, router]);

  if (isAuthUserLoading) return <Loading />;
  if (authUser) return null;

  return (
    <div className="flex font-mono flex-col items-center justify-center gap-y-5 min-h-dvh relative z-50">
      <Button
        variant="outline"
        className="flex items-center shadow-lg gap-3"
        onMouseDown={async () => {
          //TODO: change it to useMutation
          try {
            const isDonatorSignup = await Auth.signUpWithGoogle({
              preferredLanguage: currentLanguage,
            });

            if (!isDonatorSignup) {
              toast.success(t("toast.signUpSuccess"));
            } else {
              toast.success(t("toast.signInSuccess"));
            }
            router.push(redirectTo);
          } catch (error) {
            console.error(error);
            toast.error(t("toast.signUpError"));
          }
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {t("nav.signupWithGoogle")}
      </Button>
      <Button
        variant="outline"
        className="flex items-center shadow-lg gap-3"
        onMouseDown={async () => {
          try {
            await Auth.signInWithGoogle();
            toast.success(t("toast.signInSuccess"));
            router.push(redirectTo);
          } catch (error) {
            console.error(error);
            toast.error(t("toast.signInError"));
          }
        }}
      >
        <FcGoogle className="w-7 h-7" />
        {t("nav.signinWithGoogle")}
      </Button>
    </div>
  );
}
