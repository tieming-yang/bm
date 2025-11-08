"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Auth from "@/models/auth";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";

type Props = {};
export default function SignOutButton({}: Props) {
  const router = useRouter();
  const { t } = useTranslation("common");

  return (
    <Button
      className="w-full max-w-md"
      onClick={async () => {
        try {
          //TODO: Change to useMutation
          await Auth.signOut();
          toast.success(t("toast.signOutSuccess"));
          router.replace("/");
        } catch (error) {
          console.error(error);
          toast.error(t("toast.signOutError"), {});
        }
      }}
    >
      {t("nav.signout")}
    </Button>
  );
}
