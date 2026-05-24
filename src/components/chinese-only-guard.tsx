"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Globe, Languages } from "lucide-react";
import useTranslation from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";

const CHINESE_ONLY_ROUTES = ["/beyond-music", "/school/summer/2026/registration"];

export default function ChineseOnlyGuard({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  const { currentLanguage, changeLanguage } = useTranslation();

  const isChinese = currentLanguage?.startsWith("zh");

  // Check if current route matches any Chinese-only route prefix
  const isChineseOnlyRoute = CHINESE_ONLY_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(route + "/");
  });

  // If the route is Chinese-only and the current language is not Chinese, show fallback
  if (isChineseOnlyRoute && !isChinese) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4 py-12">
        <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
            <Globe className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white font-sans">
              Chinese Only Content
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We are so sorry, but the current page is only supported in Chinese.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => changeLanguage("zh-TW")}
              className="w-full rounded-full flex items-center justify-center gap-2"
              size="lg"
            >
              <Languages className="w-4 h-4" />
              Switch to Chinese (切換至中文)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
