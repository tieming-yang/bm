"use client";

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import useProfile from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import Price from "@/models/prices";
import Profile from "@/models/profiles";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const tiers = [
  {
    name: "join.plans.monthly.title",
    id: "tier-individuel",
    href: "#",
    price: Price.MONTHLY_PRICE,
    description: "join.plans.monthly.description",
    features: "join.plans.monthly.features",
    featured: false,
    priceId: Price.getMonthlyPriceId(),
  },
  {
    name: "join.plans.lifeTime.title",
    id: "tier-individuel",
    href: "#",
    price: Price.LIFE_TIME_PRICE,
    description: "gloryShare.hero.description",
    features: "join.plans.lifeTime.features",
    featured: true,
    priceId: Price.getLiftTimePriceId(),
  },
  // TODO: add subscribtion tiers
];

export default function PriceSection() {
  const { t } = useTranslation("glory-share");
  const { profile, isProfileLoading } = useProfile();
  const router = useRouter();
  const currentPathname = usePathname();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (canceled) {
      toast.info(t("gloryShare.toast.checkoutCanceled"));
    }
  }, [canceled, t]);

  const joinMutation = useMutation<string, Error, { priceId: string }>({
    mutationKey: ["glory-share", "checkout"],
    mutationFn: async ({ priceId }) => {
      const payload = { uid: profile!.uid, email: profile!.email, priceId };

      const rawResponse = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = await rawResponse.json().catch(() => ({}));
      if (!rawResponse.ok) {
        console.log(response);
        throw new Error(response?.error ?? "Checkout session failed");
      }

      if (!response?.url) throw new Error("Missing checkout URL");
      return response.url as string;
    },
    onSuccess: (url) => {
      toast.success(t("gloryShare.toast.checkoutRedirect"));
      window.location.href = url;
    },
    onError: (error) => {
      console.error(error);
      t("gloryShare.toast.checkoutError");
    },
  });

  if (isProfileLoading) {
    return <Loading />;
  }

  const isGloryShareMember = Profile.isGloryShareMember(profile);

  return (
    <div className="relative px-6 py-24 bg-gray-900 isolate sm:py-32 lg:px-8">
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
          {t("join.hero.plan")}
        </h2>
        <p className="mt-2 text-2xl font-semibold tracking-wider sm:leading-20 text-white text-balance sm:text-6xl">
          {t("join.hero.title")}
        </p>
      </div>
      <p className="max-w-3xl text-primary-foreground-gradient mx-auto mt-6 text-3xl font-medium text-center text-pretty">
        {t("join.hero.limitTimeOffer")}
      </p>
      <div
        className={cn(
          "items-center max-w-lg mx-auto mt-16 grid grid-cols-1 gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl",
          tiers.length === 1 && "xl:grid-cols-1",
          tiers.length === 2 && "xl:grid-cols-2",
          tiers.length >= 3 && "xl:grid-cols-3"
        )}
      >
        {tiers.map((tier, tierIdx) => {
          const features = t(tier.features, { returnObjects: true }) as string[];
          const isLifeTime = tier.name.includes("lifeTime");

          return (
            <div
              key={tier.priceId}
              className={cn(
                tier.featured ? "relative bg-gray-800" : "bg-white/2.5 sm:mx-8 lg:mx-0",
                tier.featured
                  ? ""
                  : tierIdx === 0
                  ? "rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl"
                  : "sm:rounded-t-none lg:rounded-tr-3xl lg:rounded-bl-none",
                "rounded-3xl p-8 ring-1 ring-white/10 sm:p-10"
              )}
            >
              <h3
                id={tier.id}
                className={cn(
                  tier.featured ? "text-primary-foreground-gradient" : "text-white",
                  "text-base/7 font-semibold"
                )}
              >
                {t(tier.name)}
              </h3>
              <p className="flex items-baseline mt-4 gap-x-2">
                <span
                  className={cn(
                    tier.featured ? "text-white" : "text-white",
                    "text-5xl font-semibold tracking-tight"
                  )}
                >
                  ${tier.price}
                </span>
                <span
                  className={cn(
                    tier.featured ? "text-gray-400" : "text-gray-400",
                    `text-base ${isLifeTime && "hidden"}`
                  )}
                >
                  /month
                </span>
              </p>
              <p
                className={cn(
                  tier.featured ? "text-gray-300" : "text-gray-300",
                  "mt-6 text-base/7"
                )}
              >
                {t(tier.description)}
              </p>
              <ul
                role="list"
                className={cn(
                  tier.featured ? "text-gray-300" : "text-gray-300",
                  "mt-8 space-y-3 text-sm/6 sm:mt-10"
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
              {isGloryShareMember ? (
                <p className="mt-5 text-2xl text-center">
                  {t("gloryShare.hero.primaryCtaAfterJoin")}
                </p>
              ) : (
                <Button
                  size="lg"
                  className="w-full px-8 mx-auto mt-5 rounded-full"
                  onClick={() => {
                    if (!profile) {
                      toast.warning(t("gloryShare.toast.requestSignIn"));
                      router.push(`/signin?redirectTo=${currentPathname}`);
                      return;
                    }

                    joinMutation.mutate({ priceId: tier.priceId });
                  }}
                >
                  {joinMutation.isPending
                    ? t("gloryShare.hero.processingCta")
                    : t("gloryShare.hero.primaryCta")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
