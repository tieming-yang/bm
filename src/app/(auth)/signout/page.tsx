"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Loading from "@/app/loading";
import useAuthUser from "@/hooks/use-auth-user";
import SignOutButton from "./signout-button";

type Props = {};
export default function SignOutPage({}: Props) {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();

  useEffect(() => {
    if (!isAuthUserLoading && !authUser) router.replace("/signin");
  }, [authUser, isAuthUserLoading, router]);

  if (isAuthUserLoading) {
    return <Loading />;
  }
  if (!authUser) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60dvh] px-4">
      <SignOutButton />
    </div>
  );
}
