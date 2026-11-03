"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Axe, ChevronLeftIcon, Menu, User } from "lucide-react";
import LanguageSwitcher from "./language-switcher";
import useTranslation from "../hooks/use-translation";
import useAuthUser from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TFunction } from "i18next";
import Config from "@/models/config";
import { ADMIN_UID } from "@/utils/constants";
import { isRouteActive } from "@/lib/ui/navigation";
import { isARAuthoringPath } from "@/lib/ui/ar-authoring";
import { useUnsavedNavigation } from "@/components/unsaved-changes-provider";

export const navRoutes = [
  { href: "/", label: (t: TFunction<string, undefined>) => t("nav.home") },
  { href: "/about", label: (t: TFunction<string, undefined>) => t("nav.about") },
  { href: "/glory-share", label: (t: TFunction<string, undefined>) => t("nav.gloryShare") },
  { href: "/ar", label: (t: TFunction<string, undefined>) => t("nav.ar") },
  { href: "/beyond-music", label: (t: TFunction<string, undefined>) => t("nav.beyondMusic") },
  { href: "/bible-gallery", label: (t: TFunction<string, undefined>) => t("nav.bibleGallery") },
  { href: "/daily-blessing", label: (t: TFunction<string, undefined>) => t("nav.greet") },
  { href: "/daily-grace-snacks", label: (t: TFunction<string, undefined>) => t("nav.dailyGraceSnacks") },
  { href: "/school", label: (t: TFunction<string, undefined>) => t("nav.bibleSchool") },
  { href: "https://shop.beyond-media.art/", label: (t: TFunction<string, undefined>) => t("nav.bibleProducts") },
  { href: "/contact", label: (t: TFunction<string, undefined>) => t("nav.contact") },
  { href: "/beyond-art", label: (t: TFunction<string, undefined>) => t("nav.beyond-art") },
  { href: "/donate", label: (t: TFunction<string, undefined>) => t("nav.donate") },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const unsavedNavigation = useUnsavedNavigation();
  const { t } = useTranslation();
  const { t: tUI } = useTranslation("ui");
  const { authUser } = useAuthUser();
  const reducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { setIsMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1800px)");
    const closeOnDesktop = () => { if (query.matches) setIsMenuOpen(false); };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <nav aria-label={tUI("navigation.primary")} className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-(--layer-navigation) px-3 sm:px-5">
        <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border bg-background/90 p-2 shadow-xl backdrop-blur-xl sm:gap-3">
          <div className="hidden items-center gap-5 px-3 min-[1800px]:flex">
            {navRoutes.map((route) => (
              <Link key={route.href} href={route.href} aria-current={isRouteActive(pathname, route.href) ? "page" : undefined} className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-primary ${isRouteActive(pathname, route.href) ? "text-primary underline decoration-primary/60 underline-offset-8" : "text-foreground"}`}>
                {route.label(t)}
              </Link>
            ))}
          </div>
          {pathname !== "/" && <Button className="min-[1800px]:hidden" variant="outline" size="icon" aria-label={tUI("actions.back")} onClick={() => isARAuthoringPath(pathname) ? unsavedNavigation.back() : router.back()}><ChevronLeftIcon aria-hidden="true" /></Button>}
          {isMounted && <>
            {(!Config.isProd || authUser?.uid === ADMIN_UID) && <Button variant="outline" size="icon" asChild><Link href="/sandbox" aria-label={tUI("actions.sandbox")}><Axe aria-hidden="true" /></Link></Button>}
            <div className="hidden min-[1800px]:block"><LanguageSwitcher /></div>
            {authUser ? <Button size="icon" asChild><Link href={`/profile/${authUser.uid}`} aria-label={tUI("actions.profile")}><User aria-hidden="true" /></Link></Button> : <Button variant="outline" asChild><Link href="/signin">{t("nav.signin")}</Link></Button>}
          </>}
          <DialogTrigger asChild><Button type="button" variant="outline" size="icon" className="min-[1800px]:hidden" aria-label={tUI("actions.menu")}><Menu aria-hidden="true" /></Button></DialogTrigger>
        </div>
      </nav>
      <DialogContent className="inset-0 left-0 top-0 h-dvh w-full max-h-dvh max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-primary-gradient-50 px-6 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <DialogTitle className="sr-only">{tUI("navigation.menuTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{tUI("navigation.primary")}</DialogDescription>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <nav aria-label={tUI("navigation.primary")}>
            <ul className="flex flex-col items-stretch gap-2">
              {navRoutes.map((route, index) => <motion.li key={route.href} initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.3, delay: reducedMotion ? 0 : index * 0.1 }}>
                <Link href={route.href} onClick={() => setIsMenuOpen(false)} aria-current={isRouteActive(pathname, route.href) ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-center text-lg font-medium hover:bg-primary/10 ${isRouteActive(pathname, route.href) ? "text-primary" : "text-foreground"}`}>{route.label(t)}</Link>
              </motion.li>)}
            </ul>
          </nav>
          <div className="flex justify-center"><LanguageSwitcher /></div>
          <p className="border-t pt-5 text-center text-xs text-muted-foreground">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
