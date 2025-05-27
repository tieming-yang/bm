"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useFirebaseUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/useTranslation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

type Props = {};
export default function SignInPage({}: Props) {
  const router = useRouter();
  const { user, initializing } = useFirebaseUser();
  const { t, currentLanguage } = useTranslation();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/";

  if (initializing) {
    return <Loading />;
  }
  if (user) {
    router.push(redirectTo);
    return null;
  }

  return (
    <div className="flex flex-col gap-y-5 items-center justify-center min-h-dvh">
      <Button
        variant="outline"
        className="flex items-center gap-3 shadow-lg"
        onMouseDown={async () => {
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
        className="flex items-center gap-3 shadow-lg"
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
