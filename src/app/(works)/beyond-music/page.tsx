"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";

export default function BeyondMusicPage() {
  const { t } = useTranslation("beyond-music");
  const [activeHash, setActiveHash] = useState<string>("#overview");
  const navLinks = [
    { href: "#overview", label: t("beyondMusic.navigation.overview") },
    { href: "#first-listen", label: t("beyondMusic.navigation.invitation") },
  ];

  return (
    <div className="container px-4 py-16 mx-auto space-y-16 h-svh">
      <section
        id="overview"
        className="relative px-8 overflow-hidden border shadow-lg rounded-3xl border-primary/20 bg-linear-to-br from-primary/10 via-background to-secondary/10 py-14 shadow-primary/10"
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute w-64 h-64 rounded-full -top-10 left-1/3 bg-primary/40 blur-3xl opacity-70" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-secondary/40 blur-[120px] opacity-60" />
          <div className="absolute w-48 h-48 rounded-full inset-y-10 right-10 bg-primary/30 blur-3xl opacity-60" />
        </div>
        <div className="max-w-3xl space-y-6">
          <nav className="flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            <a href="/#works" className="transition hover:text-primary">
              {t("beyondMusic.breadcrumb.works")}
            </a>
            <span className="px-2 text-muted-foreground/60">/</span>
            <span className="text-primary">{t("beyondMusic.breadcrumb.current")}</span>
          </nav>
          <div className="flex flex-wrap text-sm gap-3 text-muted-foreground">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-active={activeHash === link.href}
                className="rounded-full border border-transparent px-4 py-1.5 font-medium transition hover:border-primary/40 hover:text-primary data-[active=true]:border-primary/60 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {t("beyondMusic.badge")}
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-balance md:text-5xl">
              {t("beyondMusic.hero.title")}
            </h1>
            <p className="text-lg text-muted-foreground">{t("beyondMusic.hero.subtitle")}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t("beyondMusic.hero.ctaNote")}</p>
        </div>
        <div className="absolute inset-0 pointer-events-none -z-10 opacity-30">
          <div className="absolute inset-y-0 right-0 w-1/2 rounded-l-full bg-gradient-to-r from-transparent via-primary/20 to-primary/40 blur-3xl" />
        </div>
      </section>

      <section
        id="first-listen"
        className="relative px-8 py-10 overflow-hidden border shadow-lg rounded-3xl border-primary/30 bg-primary/5"
      >
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute w-48 h-48 rounded-full -left-10 top-1/2 -translate-y-1/2 bg-secondary/30 blur-3xl opacity-80" />
          <div className="absolute bottom-0 right-0 h-64 w-64 translate-y-1/3 rounded-full bg-primary/40 blur-[140px] opacity-70" />
        </div>
        <div className="max-w-3xl space-y-6">
          <h3 className="text-3xl font-semibold">{t("beyondMusic.invitation.title")}</h3>
          <p className="text-lg text-muted-foreground">{t("beyondMusic.invitation.message")}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full" asChild>
              <a href="/glory-share">{t("beyondMusic.invitation.joinButton")}</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
