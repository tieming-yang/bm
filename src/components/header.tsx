"use client";

import Logo from "./logo";
import { Breadcrumb } from "./breadcrumb";
import { usePathname } from "next/navigation";

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

  const isExcludedRoute = HEADER_EXCLUDE_RULES.some((rule) =>
    matchesExcludeRule(currentPathname, rule)
  );

  if (isExcludedRoute) return null;

  return (
    <header className="fixed flex items-start justify-center w-full pt-1 z-100 h-fit">
      <div className="fixed left-3">
        <Logo />
      </div>
      <Breadcrumb />
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
