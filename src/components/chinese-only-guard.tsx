"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import useTranslation from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";

const CHINESE_ONLY_ROUTES = ["/beyond-music", "/school/summer/2026/registration"];

export default function ChineseOnlyGuard({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  const { currentLanguage } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);

  const isChinese = currentLanguage?.startsWith("zh");

  // Check if current route matches any Chinese-only route prefix
  const isChineseOnlyRoute = CHINESE_ONLY_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(route + "/");
  });

  // Reset dismissal state when routing changes
  useEffect(() => {
    setIsDismissed(false);
  }, [pathname]);

  return (
    <>
      {children}
      {isChineseOnlyRoute && !isChinese && !isDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <Globe className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white font-sans">
                Chinese Content Only
                <span className="block text-lg font-medium text-white/70 mt-1">
                  此頁面僅提供中文
                </span>
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This page is only supported in Chinese. You can click continue to view it in Chinese.
                <span className="block mt-1 text-xs text-muted-foreground/80">
                  本頁面僅提供中文內容，您可以點擊繼續以中文瀏覽。
                </span>
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => setIsDismissed(true)}
                className="w-full rounded-full flex items-center justify-center gap-2"
                size="lg"
              >
                Continue (繼續)
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
