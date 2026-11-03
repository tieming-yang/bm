"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, BoxIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import Loading from "@/app/loading";
import DashboardError from "@/app/dashboard/dashboard-error";
import useTranslation from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useAuthUser from "@/hooks/use-auth-user";
import Auth from "@/models/auth";
import { Policy } from "@/lib/policy";

export default function DashboardPortalPage() {
  const router = useRouter();
  const { t } = useTranslation("dashboard");
  const { authUser, isAuthUserLoading } = useAuthUser();

  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace("/signin?redirectTo=%2Fdashboard");
    }
  }, [authUser, isAuthUserLoading, router]);

  const { data: profileData, isLoading: isRoleLoading, error: roleError, refetch: refetchRole } = useQuery({
    queryKey: ["profile-role", authUser?.uid],
    queryFn: async () => {
      const token = await Auth.user?.getIdToken();
      const response = await fetch(`/api/profiles/${authUser?.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json() as Promise<{ role: string }>;
    },
    enabled: !!authUser,
    retry: false,
  });

  const isLoading = isAuthUserLoading || (authUser && isRoleLoading);
  const role = profileData?.role;
  const isAuthorized = Policy.isPrivileged(role);

  useEffect(() => {
    if (!isLoading && authUser && !roleError && !isAuthorized) {
      router.replace("/not-found");
    }
  }, [authUser, isLoading, isAuthorized, roleError, router]);

  if (roleError) {
    return <DashboardError onRetry={() => void refetchRole()} />;
  }

  if (isLoading || !authUser || !isAuthorized) {
    return <Loading fullScreen />;
  }

  const showSummerSchool = Policy.canViewSummerSchool(role);
  const showAR = Policy.canViewAR(role);

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-sans min-h-svh justify-center max-w-5xl gap-8">
      <div className="text-center md:text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("portal.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("portal.description")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {showSummerSchool && (
          <Card className="flex flex-col justify-between transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 border rounded-lg bg-primary/5">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t("portal.schoolTitle")}</CardTitle>
                  <CardDescription>{t("portal.schoolSummary")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("portal.schoolDescription")}
              </p>
              <div className="mt-2 flex justify-end">
                <Button asChild className="w-fit flex items-center gap-2"><Link href="/dashboard/summer-school">
                    {t("manage")}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showAR && (
          <Card className="flex flex-col justify-between transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 border rounded-lg bg-amber-500/5">
                  <BoxIcon className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <CardTitle>{t("portal.arTitle")}</CardTitle>
                  <CardDescription>{t("portal.arSummary")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t("portal.arDescription")}
              </p>
              <div className="mt-2 flex justify-end">
                <Button asChild className="w-fit flex items-center gap-2"><Link href="/dashboard/ar">
                    {t("manage")}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
