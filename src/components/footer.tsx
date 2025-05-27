"use client";

import Link from "next/link";
import useTranslation from "../hooks/useTranslation";
import Logo from "./logo";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-primary/10 backdrop-blur-lg bg-background/80">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo>
              <span className="font-bold text-xl">{t("home.title")}</span>
            </Logo>

            <p className="text-sm text-muted-foreground">{t("footer.explore")}</p>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/gallery"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.gallery")}
                </Link>
              </li>
              <li>
                <Link
                  href="/donate"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.donate")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.contact")}
                </Link>
              </li>
            </ul>
          </div>
          {/* 
          <div>
            <h3 className="font-medium text-lg mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.cookiePolicy")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">{t("footer.followUs")}</h3>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
                <span className="sr-only">YouTube</span>
              </Link>
            </div>
          </div> */}
        </div>

        <div className="mt-12 pt-8 border-t border-primary/10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-sm text-muted-foreground">{t("footer.designDev")}</p>
        </div>
      </div>
    </footer>
  );
}
