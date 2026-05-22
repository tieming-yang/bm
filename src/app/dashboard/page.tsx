"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, BoxIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useAuthUser from "@/hooks/use-auth-user";
import Auth from "@/models/auth";
import { Policy } from "@/lib/policy";

export default function DashboardPortalPage() {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();

  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace("/signin?redirectTo=%2Fdashboard");
    }
  }, [authUser, isAuthUserLoading, router]);

  const { data: profileData, isLoading: isRoleLoading } = useQuery({
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
    if (!isLoading && authUser && !isAuthorized) {
      router.replace("/not-found");
    }
  }, [authUser, isLoading, isAuthorized, router]);

  if (isLoading || !authUser || !isAuthorized) {
    return <Loading />;
  }

  const showSummerSchool = Policy.canViewSummerSchool(role);
  const showAR = Policy.canViewAR(role);

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-serif min-h-svh justify-center max-w-5xl gap-8">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight">管理員主控台</h1>
        <p className="text-muted-foreground mt-2">請選擇您需要管理的系統模組。</p>
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
                  <CardTitle>夏令營報名管理</CardTitle>
                  <CardDescription>查看與篩選夏令營學生報名表單</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                提供完整的唯讀報名列表，支援關鍵字搜尋家長、兒童以及依照年級進行資料篩選。
              </p>
              <div className="mt-2 flex justify-end">
                <Link href="/dashboard/summer-school" className="w-full sm:w-auto">
                  <Button className="w-full flex items-center gap-2">
                    進入管理
                    <ArrowRightIcon className="w-4 h-4" />
                  </Button>
                </Link>
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
                  <CardTitle>AR 體驗管理</CardTitle>
                  <CardDescription>管理與設定 AR 體驗與模型配置</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                設定用於聖經學堂場景展示的 3D 立體模型及對應的 AR 裝置讀取配置。
              </p>
              <div className="mt-2 flex justify-end">
                <Link href="/dashboard/ar" className="w-full sm:w-auto">
                  <Button className="w-full flex items-center gap-2">
                    進入管理
                    <ArrowRightIcon className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
