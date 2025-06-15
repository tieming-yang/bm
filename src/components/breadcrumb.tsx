"use client";

import { usePathname, useRouter } from "next/navigation";
import useTranslation from "../hooks/useTranslation";
import Books from "@/data/books";

const routeMap: Record<string, string> = {
  about: "nav.about",
  contact: "nav.contact",
  "bible-gallery": "nav.bibleGallery",
  services: "nav.services",
  donate: "nav.donate",
  signin: "nav.signin",
  settings: "nav.settings",
  ...Books.toTranslationKeys,
};

export function Breadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { t: tBooks } = useTranslation("books");

  if (!pathname || pathname === "/") return null;
  const segments = pathname.split("/").filter(Boolean);

  const handleNavigation = (index: number) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    router.push(path);
  };

  // Map route segments to translation keys
  const getTranslationKey = (segment: string): string => {
    return routeMap[segment] || segment;
  };

  return (
    <nav className="mx-auto mt-4 font-serif text-sm z-50 text-muted-foreground">
      <ul className="flex items-center space-x-2">
        <li>
          <button
            onClick={() => router.push("/")}
            className="hover:underline text-muted-foreground"
          >
            {t("nav.home")}
          </button>
        </li>
        {segments.map((segment, index) => (
          <li key={index} className="">
            <span className="text-gray-600 dark:text-gray-400">/ </span>
            <button
              onClick={() => handleNavigation(index)}
              className="hover:underline text-primary-foreground"
            >
              {Books.order.includes(segment)
                ? tBooks(segment)
                : t(getTranslationKey(decodeURIComponent(segment.toLowerCase())))}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
