"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useTranslation from "../hooks/use-translation";
import Books, { Book } from "@/data/books";
import { breadcrumbEntries } from "@/lib/ui/navigation";

const routeMap: Record<string, string> = {
  about: "nav.about", contact: "nav.contact", "bible-gallery": "nav.bibleGallery", "daily-blessing": "nav.greet",
  "bible-products": "nav.bibleProducts", donate: "nav.donate", signin: "nav.signin", signup: "nav.signup",
  settings: "nav.settings", "terms-of-service": "footer.termsOfService", "privacy-policy": "footer.privacyPolicy",
  "glory-share": "nav.gloryShare", ar: "nav.ar", join: "nav.join", "daily-grace-snacks": "nav.dailyGraceSnacks",
  "beyond-music": "nav.beyondMusic", school: "nav.bibleSchool", profile: "nav.profile", "beyond-art": "nav.beyond-art",
};
const interfaceRoutes: Record<string, string> = { dashboard: "dashboard", "summer-school": "summerSchool", summer: "summer", registration: "registration", edit: "edit", cart: "cart", orders: "orders", success: "success" };

export function Breadcrumb() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { t: tUI } = useTranslation("ui");
  const { t: tBooks } = useTranslation("books");
  if (!pathname || pathname === "/") return null;

  return (
    <nav aria-label={tUI("navigation.breadcrumb")} className="min-w-0 overflow-x-auto rounded-full border bg-background/90 px-4 py-2 text-sm backdrop-blur-xl">
      <ol className="flex min-h-6 items-center gap-2 whitespace-nowrap">
        <li><Link href="/" className="text-muted-foreground hover:text-primary">{t("nav.home")}</Link></li>
        {breadcrumbEntries(pathname).map((entry) => {
          const label = Books.order.includes(entry.segment as Book) ? tBooks(entry.segment) : routeMap[entry.segment] ? t(routeMap[entry.segment]) : interfaceRoutes[entry.segment] ? tUI(`routes.${interfaceRoutes[entry.segment]}`) : entry.segment.replace(/-/g, " ");
          return <li key={entry.href} className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="text-muted-foreground">/</span>{entry.current || !entry.linkable ? <span aria-current={entry.current ? "page" : undefined} className="max-w-52 truncate text-foreground">{label}</span> : <Link href={entry.href} className="text-muted-foreground hover:text-primary">{label}</Link>}</li>;
        })}
      </ol>
    </nav>
  );
}
