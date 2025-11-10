"use client";

import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";
import { BEYOND_EMAIL } from "@/app/(marketing)/contact/page";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type Props = {
  email?: string | null;
};

export function GloryShareSuccessContent({ email }: Props) {
  const { t } = useTranslation();

  return (
    <section className="container relative z-50 max-w-3xl px-6 py-16 mx-auto h-svh">
      <div className="px-10 pt-3 pb-10 text-center border shadow-xl space-y-6 rounded-3xl border-primary/15 bg-background/80 shadow-primary/10 backdrop-blur">
        <div className="relative flex items-center justify-center mx-auto rounded-full h-55 w-55 md:h-77 md:w-77 bg-primary/10 text-primary">
          <Image src={"/glory-share/join-success-badge.jpg"} fill alt="Glory Share Badge" className="rounded-full" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">{t("gloryShareSuccess.title")}</h1>
          <p className="text-base text-muted-foreground">
            {email
              ? t("gloryShareSuccess.subtitleWithEmail", { email })
              : t("gloryShareSuccess.subtitle")}
          </p>
        </div>
        <div className="p-5 text-sm text-left border rounded-2xl border-primary/10 bg-primary/5 text-muted-foreground">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 mt-1 text-primary" />
            <p>{t("gloryShareSuccess.instructions")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild className="px-8 rounded-full">
            <Link href="/">{t("gloryShareSuccess.cta.backHome")}</Link>
          </Button>
          <Button variant="outline" asChild className="px-8 rounded-full border-primary/30">
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
