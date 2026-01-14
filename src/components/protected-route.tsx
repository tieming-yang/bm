// src/components/protected-route.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import useAuthUser from "@/hooks/use-auth-user";
import Loading from "@/app/loading";
import useTranslation from "@/hooks/use-translation";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t: tCommon } = useTranslation("common");
  const { authUser, isAuthUserLoading } = useAuthUser();

  useEffect(() => {
    if (isAuthUserLoading || authUser) return;
    toast.error(tCommon("toast.mustSignIn"));
    router.replace(`/signin?redirectTo=${encodeURIComponent(pathname)}`);
  }, [authUser, isAuthUserLoading, pathname, router, tCommon]);

  if (isAuthUserLoading) return <Loading />;
  if (!authUser) return null;

  return <>{children}</>;
}
