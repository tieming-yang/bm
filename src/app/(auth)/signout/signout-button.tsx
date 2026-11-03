"use client";

import { useState } from "react";
import { ActionSpinner } from "@/app/loading";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Auth from "@/models/auth";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";

type Props = {};
export default function SignOutButton({}: Props) {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      className="w-full max-w-md gap-2"
      disabled={isPending}
      aria-busy={isPending}
      onClick={async () => {
        if (isPending) return;
        setIsPending(true);
        try {
          //TODO: Change to useMutation
          await Auth.signOut();
          toast.success(t("toast.signOutSuccess"));
          router.replace("/");
        } catch (error) {
          console.error(error);
          toast.error(t("toast.signOutError"), {});
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending && <ActionSpinner />}
      {t("nav.signout")}
    </Button>
  );
}
