"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import Loading from "@/components/loading";
import Auth from "@/lib/firebase/auth";
import useAuthUser from "@/hooks/use-firebae-user";
import useTranslation from "@/hooks/use-translation";
import { Sign } from "crypto";
import SignOutButton from "./signout-button";

type Props = {};
export default function SignOutPage({}: Props) {
  const router = useRouter();
  const { user, initializing } = useAuthUser();
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
