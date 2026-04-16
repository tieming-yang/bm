"use client";

import Logo from "./logo";
import { Breadcrumb } from "./breadcrumb";
import { usePathname } from "next/navigation";

const EXCLUDE_ROUTE_PREFIXES = ["/sandbox"];

export default function Header() {
  const currentPathname = usePathname();

  const isExcludedRoute = EXCLUDE_ROUTE_PREFIXES.some(
    (route) => currentPathname === route || currentPathname.startsWith(`${route}/`)
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
