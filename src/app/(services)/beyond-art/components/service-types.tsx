"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from "next/link";

const Price = {
  mv: 700,
};

const tiers = [
  {
    name: "services.beyond-art.types.mv.title",
    id: "mv",
    href: "#",
    price: Price.mv,
    description: "gloryShare.hero.description",
    features: "services.beyond-art.types.mv.features",
    featured: true,
    discount: null,
  },
];

export default function ServiceTypes() {
  const { t } = useTranslation("services");
  const renderTiers = tiers;

  return (
    <div className="relative space-y-7 px-6 py-24 isolate sm:py-32 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 overflow-hidden -top-3 -z-10 transform-gpu px-36 blur-3xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="mx-auto aspect-1155/678 w-288.75 bg-linear-to-tr from-primary to-secondary opacity-20"
        />
      </div>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-semibold text-base/7 text-primary-foreground-gradient">
          {t("services.beyond-art.types.hero.plan")}
        </h2>
        <p className="mt-2 text-2xl font-semibold tracking-wider text-white sm:leading-20 text-balance sm:text-6xl">
          {t("services.beyond-art.types.hero.title")}
        </p>
      </div>

      <div
        className={cn(
          "mx-auto grid grid-cols-1 gap-y-6 sm:gap-x-5 sm:mt-20 xl:max-w-360",
          tiers.length === 1 && "md:grid-cols-1",
          tiers.length === 2 && "md:grid-cols-2",
          tiers.length >= 3 && "md:grid-cols-2 xl:grid-cols-4"
        )}
      >
        {renderTiers.map((tier, tierIdx) => {
          const features = t(tier.features, { returnObjects: true }) as string[];
          const isOnSale = Boolean(tier.discount);

          return (
            <div
              key={tier.id}
              className={cn(
                "bg-neutral-700 font-mono rounded-3xl space-y-5 py-10 px-5 flex flex-col justify-between ring-1 ring-white/10 lg:mx-0"
              )}
            >
              <h3
                id={tier.id}
                className={cn(
                  tier.featured ? "text-primary-foreground-gradient" : "text-white",
                  "text-2xl font-semibold"
                )}
              >
                {t(tier.name)}
              </h3>

              <p className="flex items-baseline mt-4 text-5xl gap-x-2 text-primary-foreground-gradient">
                <span className="text-white text-3xl">$</span>
                <span
                  className={cn(
                    isOnSale &&
                      "text-4xl line-through decoration-3 decoration-wavy decoration-pink-500",
                    "font-mono font-semibold tracking-tight"
                  )}
                >
                  {tier.price}
                </span>
                {isOnSale && (
                  <span className="font-mono">
                    {Math.floor(Number(tier.price) * tier.discount!)}
                  </span>
                )}
              </p>
              <ul
                role="list"
                className={cn(
                  tier.featured ? "text-gray-300" : "text-gray-300",
                  "space-y-3 text-xl font-mono"
                )}
              >
                {features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon
                      aria-hidden="true"
                      className={cn(
                        tier.featured
                          ? "text-primary-foreground-gradient"
                          : "text-primary-foreground-gradient",
                        "h-6 w-5 flex-none"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button>
                <Link href="mailto:beyonddigitalmedia.art@gmail.com">
                  {t("services.beyond-art.contact")}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
