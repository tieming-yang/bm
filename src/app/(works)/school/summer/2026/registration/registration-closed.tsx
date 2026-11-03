"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";

export default function RegistrationClosed() {
  const { t } = useTranslation("school");

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-16 space-y-6" aria-labelledby="registration-closed-title">
      <h1 id="registration-closed-title" className="page-title">{t("school.registration.closedTitle")}</h1>
      <p className="text-lg text-muted-foreground">{t("school.registration.closedDescription")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild><Link href="/school">{t("school.registration.backToSchool")}</Link></Button>
        <Button variant="outline" asChild><Link href="/contact">{t("school.registration.contactUs")}</Link></Button>
      </div>
    </section>
  );
}
