"use client";

import { usePathname, useRouter } from "next/navigation";
import useTranslation from "../hooks/use-translation";
import Books, { Book } from "@/data/books";

const routeMap: Record<string, string> = {
  about: "nav.about",
  contact: "nav.contact",
  "bible-gallery": "nav.bibleGallery",
  services: "nav.services",
  donate: "nav.donate",
  signin: "nav.signin",
  signup: "nav.signup",
  settings: "nav.settings",
  "terms-of-service": "footer.termsOfService",
  "privacy-policy": "footer.privacyPolicy",
  "glory-share": "nav.gloryShare",
  "daily-grace-snacks": "nav.dailyGraceSnacks",
  "beyond-music": "nav.beyondMusic",
  success: "gloryShareSuccess.breadcrumb",
  profile: "nav.profile",
};

const UUID_LENGTH = 28;

export function Breadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { t: tBooks } = useTranslation("books");

  if (!pathname || pathname === "/") return null;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((path) => path.length < UUID_LENGTH);

  const handleNavigation = (index: number) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    router.push(path);
  };

  const translateSegment = (segment: string | Book): string => {
    if (Books.order.includes(segment as Book)) {
      return tBooks(segment);
    }
    const key = routeMap[segment];
    if (key) {
      return t(key);
    }
    return segment.replace(/-/g, " ");
  };

  return (
    <nav className="z-50 mx-auto mt-4 font-serif text-sm text-muted-foreground">
      <ul className="flex items-center space-x-2">
        <li>
          <button
            onClick={() => router.push("/")}
            className="hover:underline text-muted-foreground"
          >
            {t("nav.home")}
          </button>
        </li>
        {segments.map((segment, index) => {
          const isBookSegment = Books.order.includes(segment as Book);
          const hasExcludes = ["profile"].includes(segment);
          return (
            <li key={index}>
              <span className="text-gray-600 dark:text-gray-400">/ </span>
              <button
                onClick={() => handleNavigation(index)}
                className="hover:underline text-primary-foreground"
                disabled={isBookSegment || hasExcludes}
              >
                {translateSegment(segment)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
