"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useAuthUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

type Props = {};
export default function SignInPage({}: Props) {
  const router = useRouter();
  const { user, initializing } = useAuthUser();
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
    <div className="flex font-mono flex-col items-center justify-center gap-y-5 min-h-dvh relative z-50">
      <Button
        variant="outline"
        className="flex items-center shadow-lg gap-3"
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
