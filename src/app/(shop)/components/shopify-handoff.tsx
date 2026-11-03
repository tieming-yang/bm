"use client";

import Link from "next/link";
import { ShoppingBag, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";

type ShopifyHandoffProps = {
  purpose: "catalog" | "cart" | "orders";
};

export default function ShopifyHandoff({ purpose }: ShopifyHandoffProps) {
  const { t } = useTranslation("bible-products");

  return (
    <section className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="rounded-3xl border bg-card p-6 text-center sm:p-10 space-y-6">
        <ShoppingBag className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h1 className="font-display text-3xl leading-snug sm:text-4xl">
          {t(`handoff.${purpose}.title`)}
        </h1>
        <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">
          {t(`handoff.${purpose}.description`)}
        </p>
        {purpose === "cart" && (
          <p className="text-sm text-muted-foreground">{t("handoff.cart.cartNotice")}</p>
        )}
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <a href="https://shop.beyond-media.art/" rel="noreferrer">
              {t("handoff.shopAction")}
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href="mailto:beyonddigitalmedia.art@gmail.com">
              <Mail className="mr-2 size-4" aria-hidden="true" />
              {t("handoff.supportAction")}
            </a>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("handoff.orderHelp")}</p>
        <Link href="/" className="inline-block text-sm text-primary underline underline-offset-4">
          {t("handoff.homeAction")}
        </Link>
      </div>
    </section>
  );
}
