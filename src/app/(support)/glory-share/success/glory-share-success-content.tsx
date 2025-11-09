"use client";

import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";
import { BEYOND_EMAIL } from "@/app/(marketing)/contact/page";

type Props = {
  email?: string | null;
};

export function GloryShareSuccessContent({ email }: Props) {
  const { t } = useTranslation();

  return (
    <section className="container relative z-50 mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-6 rounded-3xl border border-primary/15 bg-background/80 p-10 text-center shadow-xl shadow-primary/10 backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">{t("gloryShareSuccess.title")}</h1>
          <p className="text-base text-muted-foreground">
            {email
              ? t("gloryShareSuccess.subtitleWithEmail", { email })
              : t("gloryShareSuccess.subtitle")}
          </p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 text-sm text-left text-muted-foreground">
          <div className="flex items-start gap-3">
            <Mail className="mt-1 h-5 w-5 text-primary" />
            <p>{t("gloryShareSuccess.instructions")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild className="rounded-full px-8">
            <Link href="/">{t("gloryShareSuccess.cta.backHome")}</Link>
          </Button>
          <Button variant="outline" asChild className="rounded-full border-primary/30 px-8">
            <Link href="/bible-gallery">{t("gloryShareSuccess.cta.viewGallery")}</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("gloryShareSuccess.support", { email: BEYOND_EMAIL })}
        </p>
      </div>
    </section>
  );
}
