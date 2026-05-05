"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Axe, ChevronLeftIcon, Moon, ShoppingCartIcon, Sun, User } from "lucide-react";

import { useTheme } from "next-themes";
import LanguageSwitcher from "./language-switcher";
import useTranslation from "../hooks/use-translation";
import useAuthUser from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";
import { TFunction } from "i18next";
import { useShoppingCart } from "@/providers/shopping-cart-provider";
import Cart from "@/models/cart";
import Config from "@/models/config";
import { ADMIN_UID } from "@/utils/constants";

export const navRoutes = [
  { href: "/", label: (t: TFunction<string, undefined>) => t("nav.home") },
  { href: "/about", label: (t: TFunction<string, undefined>) => t("nav.about") },
  { href: "/glory-share", label: (t: TFunction<string, undefined>) => t("nav.gloryShare") },
  { href: "/ar", label: (t: TFunction<string, undefined>) => t("nav.ar") },
  { href: "/beyond-music", label: (t: TFunction<string, undefined>) => t("nav.beyondMusic") },
  { href: "/bible-gallery", label: (t: TFunction<string, undefined>) => t("nav.bibleGallery") },
  {
    href: "/daily-grace-snacks",
    label: (t: TFunction<string, undefined>) => t("nav.dailyGraceSnacks"),
  },
  { href: "/school", label: (t: TFunction<string, undefined>) => t("nav.bibleSchool") },
  {
    href: "https://shop.beyond-media.art/",
    label: (t: TFunction<string, undefined>) => t("nav.bibleProducts"),
  },
  { href: "/contact", label: (t: TFunction<string, undefined>) => t("nav.contact") },
  { href: "/beyond-art", label: (t: TFunction<string, undefined>) => t("nav.beyond-art") },
  { href: "/donate", label: (t: TFunction<string, undefined>) => t("nav.donate") },
  // { href: "/signin", label:(t: TFunction<string, undefined>) => t("nav.signin") },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const shoppingCart = useShoppingCart();
  const cartItems = Cart.getItemsCount(shoppingCart);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const { authUser } = useAuthUser();

  return (
    <>
      <nav className="fixed px-5 font-serif bottom-3 min-w-svw z-120 h-fit">
        <div className="flex items-center min-w-full gap-x-5">
          <div className="hidden py-3 flex-1 items-center max-w-fit gap-6 px-4 xl:flex xl:border xl:rounded-full xl:shadow-[inset_0_1px_2px_#ffffff70,0_2px_4px_rgba(0,0,0,0.19),0_4px_8px_rgba(0,0,0,0.08)] xl:backdrop-blur-xl xl:bg-primary-gradient-10 xl:border-black/10">
            {navRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`xl:text-sm font-medium transition-colors hover:text-primary ${
                  pathname?.includes(route.href) && route.href !== "/"
                    ? "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                    : ""
                } ${
                  pathname === route.href && route.href === "/"
                    ? "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                    : ""
                }`}
              >
                {route.label(t)}
              </Link>
            ))}
          </div>

          <section className="z-50 flex self-end justify-end gap-5 ml-auto shrink-0">
            {pathname !== "/" && (
              <Button
                className="xl:hidden"
                variant={"outline"}
                size="icon"
                onClick={() => router.back()}
              >
                <ChevronLeftIcon />
              </Button>
            )}
            {isMounted && (
              <div className="flex gap-x-5">
                {(!Config.isProd || authUser?.uid === ADMIN_UID) && (
                  <Link href="/sandbox">
                    <Button variant={"outline"} size={"default"}>
                      <Axe />
                    </Button>
                  </Link>
                )}
                <div className="hidden xl:block">
                  <LanguageSwitcher />
                </div>
                {authUser ? (
                  <Link
                    href={`/profile/${authUser.uid}`}
                    className="font-medium text-primary-foreground"
                  >
                    <Button size="icon">
                      <User />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signin">
                    <Button variant={"outline"} size={"default"}>
                      {t("nav.signin")}
                    </Button>
                  </Link>
                )}

                {/* <Link href={"/cart"}>
                  <Button size={"icon"} variant={"secondary"} className="relative">
                    {cartItems > 0 && (
                      <span className="absolute inline-flex items-center justify-center px-1 font-mono font-semibold text-white bg-red-500 rounded-full -top-3 -right-3 min-w-7 h-7 backdrop-blur-3xl text-md">
                        {cartItems}
                      </span>
                    )}
                    <ShoppingCartIcon />
                  </Button>
                </Link> */}
              </div>
            )}
          </section>
          <Button
            onClick={toggleMenu}
            type="button"
            variant={"outline"}
            size="icon"
            className="relative flex flex-col items-center justify-center z-60 xl:hidden focus:outline-hidden"
            aria-label="Menu"
            aria-expanded={isMenuOpen}
          >
            <span
              className={`block w-6 h-0.5 bg-foreground rounded-full transition-all duration-300 ease-out ${
                isMenuOpen ? "rotate-45 translate-y-0.5" : "-translate-y-1"
              }`}
            ></span>
            <span
              className={`block w-6 h-0.5 bg-foreground rounded-full transition-all duration-300 ease-out ${
                isMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-1"
              }`}
            ></span>
          </Button>
        </div>
      </nav>

      {/* Full screen mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 font-serif z-110 xl:hidden bg-primary-gradient-50"
          >
            <div className="flex flex-col h-full px-6 pt-5 pb-10">
              <div className="flex flex-col items-center justify-center gap-4 sm:gap-y-7">
                {navRoutes.map((route, index) => (
                  <motion.div
                    key={route.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={route.href}
                      className={`text-xl sm:text-2xl duration-300 transition-all font-medium  hover:text-primary ${
                        pathname?.includes(route.href) && route.href !== "/"
                          ? "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                          : ""
                      } ${
                        pathname === route.href && route.href === "/"
                          ? "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                          : ""
                      }`}
                    >
                      {route.label(t)}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="flex flex-col gap-4 mt-auto"
              >
                {isMounted && (
                  <div className="flex justify-center">
                    <LanguageSwitcher />
                  </div>
                )}
                <div className="pt-6 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} 彼岸數位媒體
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
