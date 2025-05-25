"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useFirebaseUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";

type Props = {};
export default function SignInPage({}: Props) {
  const router = useRouter();
  const { user, initializing } = useFirebaseUser();
  const { t, currentLanguage } = useTranslation();
  const { toast } = useToast();

  if (initializing) {
    return <Loading />;
  }
  if (user) {
    router.push("/");
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
            toast({
              description: t("toast.signInSuccess"),
            });
            router.push("/");
          } catch (error) {
            console.error(error);
            toast({
              description: t("toast.signInError"),
              variant: "destructive",
            });
          }
        }}
      >
        {t("nav.signin")}
      </Button>
    </div>
  );
}
