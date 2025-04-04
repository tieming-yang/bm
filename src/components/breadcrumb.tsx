"use client";

import { usePathname, useRouter } from "next/navigation";
import useTranslation from "../hooks/useTranslation";

export function Breadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  if (!pathname || pathname === "/") return null; // Don't show breadcrumb on the homepage
  const segments = pathname.split("/").filter(Boolean);

  const handleNavigation = (index: number) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    router.push(path);
  };

  // Map route segments to translation keys
  const getTranslationKey = (segment: string): string => {
    const routeMap: Record<string, string> = {
      about: "nav.about",
      contact: "nav.contact",
      gallery: "nav.gallery",
      services: "nav.services",
      donate: "nav.donate",
    };

    return routeMap[segment] || segment;
  };

  return (
    <nav className="text-sm text-muted-foreground mt-4 ml-4">
      <ul className="flex items-center space-x-2">
        <li>
          <button onClick={() => router.push("/")} className="hover:underline text-primary">
            {t("nav.home")}
          </button>
        </li>
        {segments.map((segment, index) => (
          <li key={index} className="flex items-center">
            <span className="mx-2">/</span>
            <button
              onClick={() => handleNavigation(index)}
              className="hover:underline text-primary"
            >
              {t(getTranslationKey(decodeURIComponent(segment)))}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
