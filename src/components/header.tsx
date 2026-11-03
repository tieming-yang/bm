"use client";

import Logo from "./logo";
import { Breadcrumb } from "./breadcrumb";
import { usePathname } from "next/navigation";
import useTranslation from "@/hooks/use-translation";

type HeaderExcludeRule = {
  base: string;
  includeBase?: boolean;
  includeChildren?: boolean;
};

const HEADER_EXCLUDE_RULES: HeaderExcludeRule[] = [
  {
    base: "/sandbox",
    includeBase: true,
    includeChildren: true,
  },
  {
    base: "/ar",
    includeBase: false,
    includeChildren: true,
  },
];

export default function Header() {
  const currentPathname = usePathname();
  const { t } = useTranslation("ui");

  const isExcludedRoute = HEADER_EXCLUDE_RULES.some((rule) =>
    matchesExcludeRule(currentPathname, rule)
  );

  if (isExcludedRoute) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-(--layer-header) flex h-(--header-height) items-center gap-4 px-3 pt-[env(safe-area-inset-top,0px)] sm:px-5">
      <a href="#main-content" className="absolute left-3 top-2 -translate-y-24 rounded-full bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0">{t("navigation.skip")}</a>
      <div className="shrink-0">
        <Logo />
      </div>
      <div className="mx-auto min-w-0 max-w-[calc(100%_-_5rem)]"><Breadcrumb /></div>
    </header>
  );
}

function matchesExcludeRule(pathname: string, rule: HeaderExcludeRule) {
  const normalizedBase = normalizePathname(rule.base);
  const normalizedPathname = normalizePathname(pathname);

  if (rule.includeBase && normalizedPathname === normalizedBase) {
    return true;
  }

  if (rule.includeChildren && normalizedPathname.startsWith(`${normalizedBase}/`)) {
    return true;
  }

  return false;
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}
