"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useFirebaseUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/useTranslation";
import { Sign } from "crypto";
import SignOutButton from "./signout-button";

type Props = {};
export default function SignOutPage({}: Props) {
  const router = useRouter();
  const { user, initializing } = useFirebaseUser();
  const { t } = useTranslation("common");

  if (initializing) {
    return <Loading />;
  }
  if (!user) {
    router.push("/signin");
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <SignOutButton />
    </div>
  );
}
