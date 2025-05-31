"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, User } from "lucide-react";

import { useTheme } from "next-themes";
import LanguageSwitcher from "./language-switcher";
import useTranslation from "../hooks/useTranslation";
import useFirebaseUser from "@/hooks/use-firebae-user";
import { Button } from "@/components/ui/button";
import Logo from "./logo";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const routes = [
    { href: "/", label: t("nav.home") },
    { href: "/about", label: t("nav.about") },
    // { href: "/gallery", label: t("nav.gallery") },
    { href: "/bible-gallery", label: t("nav.bibleGallery") },
    { href: "/donate", label: t("nav.donate") },
    { href: "/contact", label: t("nav.contact") },
    // { href: "/signin", label: t("nav.signin") },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const { user } = useFirebaseUser();

  return (
    <>
      <header className="fixed bottom-0 z-[100] w-full px-3 font-serif h-fit 2xl:px-0">
        <div className="container flex items-center justify-between h-16 px-4 my-2 border rounded-full shadow-md  backdrop-blur-xl bg-background/30 dark:border-white/10 border-black/10">
          <nav className="items-center hidden md:flex gap-6">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`text-sm md:text-md lg:text-lg font-medium transition-colors hover:text-primary ${
                  pathname?.includes(route.href) && route.href !== "/"
                    ? "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                    : ""
                } ${
                  pathname === route.href && route.href === "/"
                    ? "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                    : ""
                }`}
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <section className="z-50 flex gap-2">
            {isMounted && (
              <>
                <LanguageSwitcher />
                {/* Theme Toggle */}
                {/* <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-full"
                >
                  {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
                  <span className="sr-only">Toggle theme</span>
                </Button> */}
                {user ? (
                  <Link href="/settings" className="text-sm font-medium text-primary-foreground">
                    <Button size="icon">
                      <User className="size-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signin" className="text-sm font-medium">
                    <Button variant={"outline"}>{t("nav.signin")}</Button>
                  </Link>
                )}
              </>
            )}
          </section>
          <button
            onClick={toggleMenu}
            className="relative z-60 flex flex-col items-center justify-center md:hidden size-10 focus:outline-none"
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
                isMenuOpen ? "-rotate-45 -translate-y-0" : "translate-y-1"
              }`}
            ></span>
          </button>
        </div>
      </header>

      {/* Full screen mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 font-serif md:hidden bg-background dark:bg-background/30 backdrop-blur-lg"
          >
            <div className="flex flex-col h-full px-6 pt-20 pb-10">
              <div className="flex flex-col items-center justify-center gap-6 sm:gap-12">
                {routes.map((route, index) => (
                  <motion.div
                    key={route.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={route.href}
                      className={`text-2xl sm:text-5xl duration-300 transition-all font-medium  hover:text-primary ${
                        pathname?.includes(route.href) && route.href !== "/"
                          ? "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                          : ""
                      } ${
                        pathname === route.href && route.href === "/"
                          ? "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                          : ""
                      }`}
                    >
                      {route.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="flex flex-col mt-auto gap-4"
              >
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
