"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Auth from "@/lib/firebase/auth";
import useTranslation from "@/hooks/useTranslation";

type Props = {};
export default function SignOutButton({}: Props) {
  const router = useRouter();
  const { t } = useTranslation("common");

  return (
    <Button
      className="w-full max-w-md"
      onMouseDown={async () => {
        await Auth.signOut();
        router.push("/");
      }}
    >
      {t("nav.signout")}
    </Button>
  );
}
