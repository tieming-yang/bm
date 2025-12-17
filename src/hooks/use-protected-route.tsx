import { usePathname, useRouter } from "next/navigation";
import useTranslation from "./use-translation";
import useAuthUser from "./use-auth-user";
import Loading from "@/app/loading";
import { toast } from "sonner";
import { useEffect } from "react";

export default function useProtectedRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const { t: tCommon } = useTranslation("common");
  const { authUser, isAuthUserLoading } = useAuthUser();

  if (isAuthUserLoading) {
    return <Loading />;
  }

  useEffect(() => {
    if (isAuthUserLoading || authUser) return;
    toast.error(tCommon("toast.mustSignIn"));
    router.replace(`/signin?redirectTo=${encodeURIComponent(pathname)}`);
  }, [authUser, isAuthUserLoading, pathname, router, tCommon]);
}
