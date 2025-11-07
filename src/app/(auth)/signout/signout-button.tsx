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
      onMouseDown={async () => {
        try {
          await Auth.signOut();
          toast.success(t("toast.signOutSuccess"));
          router.push("/");
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
