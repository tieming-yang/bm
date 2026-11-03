"use client";

import Loading, { ActionSpinner } from "@/app/loading";
import { Button } from "@/components/ui/button";
import useProfile from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import Price from "@/models/prices";
import Profile from "@/models/profiles";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useTranslation from "@/hooks/use-translation";
import { toast } from "sonner";

const tiers = [
  {
    name: "join.plans.monthly.title",
    id: "tier-personal",
    href: "#",
    price: Price.MONTHLY_PRICE,
    description: "join.plans.monthly.description",
    features: "join.plans.monthly.features",
    featured: false,
    discount: null,
    priceId: Price.getMonthlyPriceId(),
  },
  {
    name: "join.plans.yearly.title",
    id: "tier-personal",
    href: "#",
    price: Price.YEARLY_PRICE,
    description: "gloryShare.hero.description",
    features: "join.plans.yearly.features",
    featured: false,
    discount: null,
    priceId: Price.getYearlyPriceId(),
  },
  {
    name: "join.plans.lifeTime.title",
    id: "tier-personal",
    href: "#",
    price: Price.LIFE_TIME_PRICE,
    description: "gloryShare.hero.description",
    features: "join.plans.lifeTime.features",
    featured: true,
    discount: null,
    priceId: Price.getLiftTimePriceId(),
  },
  {
    name: "join.plans.org.lifeTime.title",
    id: "tier-organization",
    href: "#",
    price: Price.ORG_LIFE_TIME_PRICE,
    description: "gloryShare.hero.description",
    features: "join.plans.org.lifeTime.features",
    featured: false,
    discount: 0.5,
    priceId: Price.getORGLieftTimePriceId(),
    coupon: {
      code: Price.ORG_LIFE_TIME_COUPON_CODE,
      id: Price.getORGLifeTimeCouponId(),
    },
    promotion: "join.plans.org.lifeTime.promotion",
  },
];

export default function PriceSection() {
  const { t, currentLanguage } = useTranslation("glory-share");
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

  const joinMutation = useMutation<string, Error, { priceId: string; couponId: string | null }>({
    mutationKey: ["glory-share", "checkout"],
    mutationFn: async ({ priceId, couponId }) => {
      const payload = { uid: profile!.uid, email: profile!.email, priceId, couponId };

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
      toast.error(t("gloryShare.toast.checkoutError"));
    },
  });

  const renderTiers = tiers;
  const priceFormatter = new Intl.NumberFormat(currentLanguage, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
  });

  if (isProfileLoading) {
    return <Loading />;
  }

  const isGloryShareMember = Profile.isGloryShareMember(profile);

  return (
    <div className="relative px-6 py-24 bg-card isolate sm:py-24 lg:px-8">
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
        <p className="font-display mt-2 text-3xl font-semibold tracking-wider text-white sm:leading-20 text-balance sm:text-6xl">
          {t("join.hero.title")}
        </p>
      </div>
      <p className="max-w-3xl mx-auto mt-6 text-3xl font-medium text-center text-primary-foreground-gradient text-pretty">
        {t("join.hero.limitTimeOffer")}
      </p>
      <div
        className={cn(
          "mx-auto mt-12 grid grid-cols-1 gap-6 max-w-360",
          tiers.length === 1 && "md:grid-cols-1",
          tiers.length === 2 && "md:grid-cols-2",
          tiers.length >= 3 && "md:grid-cols-2 xl:grid-cols-4"
        )}
      >
        {renderTiers.map((tier) => {
          const features = t(tier.features, { returnObjects: true }) as string[];
          const isLifeTime = tier.name.includes("lifeTime");
          const isOnSale = Boolean(tier.discount);

          return (
            <div
              key={tier.priceId}
              className={cn(
                tier.featured ? "relative bg-primary-gradient-50" : "bg-white/2.5",
                tier.id === "tier-organization" && "bg-primary-gradient-30",
                "rounded-3xl py-10 px-5 flex flex-col justify-between ring-1 ring-white/10 lg:mx-0"
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
              {isOnSale && (
                <p className="font-mono font-bold">
                  {t(tier.promotion!, { code: tier.coupon!.code })}
                </p>
              )}
              <p className="flex flex-wrap items-baseline mt-4 text-3xl gap-x-2 gap-y-1 text-primary sm:text-4xl">
                <span
                  className={cn(
                    isOnSale &&
                      "text-2xl line-through decoration-2",
                    "font-mono font-semibold tracking-tight"
                  )}
                >
                  {priceFormatter.format(Number(tier.price))}
                </span>
                {isOnSale && (
                  <span className="font-mono">
                    {priceFormatter.format(Math.floor(Number(tier.price) * tier.discount!))}
                  </span>
                )}
                <span
                  className={cn(tier.featured ? "text-gray-400" : "text-gray-400", `text-base`)}
                >
                  {tier.price === Price.MONTHLY_PRICE
                    ? t("join.plans.month")
                    : isLifeTime
                      ? t("join.plans.life")
                      : t("join.plans.year")}
                </span>
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
                  className="w-full px-6 mx-auto mt-5 rounded-full"
                  disabled={joinMutation.isPending}
                  aria-busy={joinMutation.isPending && joinMutation.variables?.priceId === tier.priceId}
                  onClick={() => {
                    if (joinMutation.isPending) return;
                    if (!profile) {
                      toast.warning(t("gloryShare.toast.requestSignIn"));
                      router.push(`/signin?redirectTo=${currentPathname}`);
                      return;
                    }
                    const couponId = tier.coupon?.id ? tier.coupon?.id : null;
                    // const couponId = null;

                    joinMutation.mutate({ priceId: tier.priceId, couponId });
                  }}
                >
                  {joinMutation.isPending && joinMutation.variables?.priceId === tier.priceId ? (
                    <><ActionSpinner /> {t("gloryShare.hero.processingCta")}</>
                  ) : t("gloryShare.hero.primaryCta")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
