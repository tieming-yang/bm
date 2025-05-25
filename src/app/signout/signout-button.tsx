"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Auth from "@/lib/firebase/auth";
import useTranslation from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";

type Props = {};
export default function SignOutButton({}: Props) {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { toast } = useToast();

  return (
    <Button
      className="w-full max-w-md"
      onMouseDown={async () => {
        try {
          await Auth.signOut();
          toast({
            description: t("toast.signOutSuccess"),
          });
          router.push("/");
        } catch (error) {
          console.error(error);
          toast({
            description: t("toast.signOutError"),
            variant: "destructive",
          });
        }
      }}
    >
      {t("nav.signout")}
    </Button>
  );
}
