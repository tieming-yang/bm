"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, BoxIcon } from "lucide-react";
import Link from "next/link";

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useAuthUser from "@/hooks/use-auth-user";
import Auth from "@/models/auth";
import { Policy } from "@/lib/policy";

export default function ArDashboardPage() {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();

  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace("/signin?redirectTo=%2Fdashboard%2Far");
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
  const isAuthorized = Policy.canViewAR(role);

  useEffect(() => {
    if (!isLoading && authUser && !isAuthorized) {
      router.replace("/not-found");
    }
  }, [authUser, isLoading, isAuthorized, router]);

  if (isLoading || !authUser || !isAuthorized) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-serif min-h-svh gap-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            返回管理首頁
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BoxIcon className="w-8 h-8 text-amber-500" />
            <div>
              <CardTitle>AR 體驗管理</CardTitle>
              <CardDescription>管理與設定聖經學堂的 AR 體驗場景及 3D 模型配置。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="p-8 border border-dashed rounded-lg flex flex-col items-center justify-center text-center gap-3 bg-muted/40">
            <BoxIcon className="w-12 h-12 text-muted-foreground animate-pulse" />
            <h3 className="text-lg font-medium">AR 編輯模組開發中</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              此功能正在進行最後階段的系統配置。未來您將可以在此處新增、修改與刪除用於行動裝置展示的 3D 聖經場景模型。
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
