"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import LanguageSwitcher from "./language-switcher";
import useTranslation from "../hooks/useTranslation";

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
    { href: "/gallery", label: t("nav.gallery") },
    { href: "/bible-gallery", label: t("nav.bibleGallery") },
    { href: "/donate", label: t("nav.donate") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <header className="fixed top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-primary/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="彼岸媒體" width={40} height={40} />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname?.includes(route.href) && route.href !== "/" ? "text-primary" : ""
                } ${pathname === route.href && route.href === "/" ? "text-primary" : ""}`}
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 z-50">
            {isMounted && (
              <>
                <LanguageSwitcher />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-full"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </>
            )}

            <button
              onClick={toggleMenu}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 relative focus:outline-none z-50"
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
            className="fixed inset-0 z-40 md:hidden bg-background dark:bg-background"
          >
            <div className="flex flex-col h-full pt-20 px-6 pb-10">
              <div className="flex flex-col gap-6">
                {routes.map((route, index) => (
                  <motion.div
                    key={route.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={route.href}
                      className={`text-2xl font-medium transition-colors hover:text-primary ${
                        pathname?.includes(route.href) && route.href !== "/" ? "text-primary" : ""
                      } ${pathname === route.href && route.href === "/" ? "text-primary" : ""}`}
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
                className="mt-auto flex flex-col gap-4"
              >
                <div className="border-t border-primary/10 pt-6">
                  <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} 彼岸媒體
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
