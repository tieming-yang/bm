"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useFirebaseUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/useTranslation";

type Props = {};
export default function SignInPage({}: Props) {
  const router = useRouter();
  const { user, initializing } = useFirebaseUser();
  const { t, currentLanguage } = useTranslation();

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
          await Auth.signInWithGoogle({
            preferredLanguage: currentLanguage,
          });
          router.push("/");
        }}
      >
        {t("nav.signin")}
      </Button>
    </div>
  );
}
