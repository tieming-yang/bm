"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useFirebaseUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/useTranslation";
import { toast } from "sonner";

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
    <div className="flex items-center justify-center min-h-dvh">
      <Button
        onMouseDown={async () => {
          try {
            await Auth.signInWithGoogle({
              preferredLanguage: currentLanguage,
            });
            toast.success(t("toast.signInSuccess"));
            router.push(redirectTo);
          } catch (error) {
            console.error(error);
            toast.error(t("toast.signInError"));
          }
        }}
      >
        {t("nav.signin")}
      </Button>
    </div>
  );
}
