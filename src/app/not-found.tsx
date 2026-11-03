"use client";

import Link from "next/link";
import { Button } from "../components/ui/button";
import useTranslation from "@/hooks/use-translation";

export default function NotFound() {
  const { t } = useTranslation("ui");

  return (
    <section className="container mx-auto flex min-h-[60svh] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="mb-3 text-sm tracking-widest text-primary">404</p>
      <h1 className="font-display mb-4 text-3xl sm:text-4xl">{t("notFound.title")}</h1>
      <p className="mb-6 text-base leading-relaxed text-muted-foreground">{t("notFound.description")}</p>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/">{t("notFound.home")}</Link>
      </Button>
    </section>
  );
}
