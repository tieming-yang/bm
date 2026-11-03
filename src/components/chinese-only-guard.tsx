"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import useTranslation from "@/hooks/use-translation";

const CHINESE_ONLY_ROUTES = ["/beyond-music"];

export default function ChineseOnlyGuard({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  const { currentLanguage, t } = useTranslation("ui");
  const showNotice = !currentLanguage.startsWith("zh") && CHINESE_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  return (
    <>
      {showNotice && <aside aria-labelledby="content-language-title" className="relative z-10 mx-auto mt-4 flex w-[calc(100%_-_2rem)] max-w-3xl gap-3 rounded-2xl border bg-card px-5 py-4">
        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div><p id="content-language-title" className="font-medium">{t("content.chineseTitle")}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("content.chineseDescription")}</p></div>
      </aside>}
      {children}
    </>
  );
}
