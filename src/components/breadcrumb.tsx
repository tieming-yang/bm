"use client";

import { usePathname, useRouter } from "next/navigation";

const routeTranslations: Record<string, string> = {
  home: "首頁",
  about: "關於我們",
  contact: "聯絡我們",
  gallery: "畫廊",
  services: "服務",
  donate: "捐款",
  // Add more route translations as needed
};

function translateRoute(segment: string): string {
  return routeTranslations[segment] || segment;
}

export function Breadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null; // Don't show breadcrumb on the homepage
  const segments = pathname.split("/").filter(Boolean);

  const handleNavigation = (index: number) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    router.push(path);
  };

  return (
    <nav className="text-sm text-muted-foreground mt-4 ml-4">
      <ul className="flex items-center space-x-2">
        <li>
          <button onClick={() => router.push("/")} className="hover:underline text-primary">
            {translateRoute("home")}
          </button>
        </li>
        {segments.map((segment, index) => (
          <li key={index} className="flex items-center">
            <span className="mx-2">/</span>
            <button
              onClick={() => handleNavigation(index)}
              className="hover:underline text-primary"
            >
              {translateRoute(decodeURIComponent(segment))}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
