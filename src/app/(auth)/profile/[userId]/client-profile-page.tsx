"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import Loading from "@/app/loading";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import Profile from "@/models/profiles";
import { QueryKey } from "@/utils/query-keys";

import SignOutButton from "../../signout/signout-button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ClientProfilePage({ userId }: { userId: string }) {
  const { authUser } = useAuthUser();
  const { t, currentLanguage } = useTranslation("settings");

  const { data: profile, isLoading } = useQuery({
    queryKey: QueryKey.profile(userId),
    queryFn: () => Profile.get(userId),
    enabled: !!userId,
  });

  if (isLoading || !profile) {
    return <Loading />;
  }

  const isOwnProfile = authUser?.uid === profile.uid;
  const isGloryShareMember = Boolean(profile.joinedGloryShare);
  const gloryShare = profile.gloryShare;
  const locale = currentLanguage === "zh-TW" ? "zh-TW" : "en-US";

  const joinedDate =
    gloryShare?.joinedAt && typeof gloryShare.joinedAt.toDate === "function"
      ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(gloryShare.joinedAt.toDate())
      : null;

  const formattedAmount =
    typeof gloryShare?.amount === "number"
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: (gloryShare?.currency ?? "usd").toUpperCase(),
        }).format(gloryShare.amount / 100)
      : null;

  const gloryPerks =
    (t("gloryShareBadge.perks", { returnObjects: true }) as string[] | undefined) ?? [];

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-4 py-12 h-fit gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {isGloryShareMember && (
        <Card className="w-full max-w-3xl bg-transparent border-0 shadow-none">
          <div className="rounded-3xl border-2 border-transparent bg-linear-to-bl from-amber-400/30 via-purple-400/30 to-pink-400/20 p-px shadow-[0_0_35px_rgba(251,191,36,0.35)]">
            <div className="rounded-[1.4rem] bg-linear-to-bl from-gray-950/90 via-gray-900/80 to-gray-900/70">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex flex-col items-center md:flex-row gap-4">
                  <div className="relative shrink-0 h-30 w-30 md:h-50 md:w-50 rounded-full bg-linear-to-bl from-amber-300/80 to-purple-500/70 p-2px shadow-[0_0_25px_rgba(251,191,36,0.55)]">
                    <div className="relative w-full h-full rounded-full bg-gray-950">
                      <Image
                        src="/glory-share/join-success-badge.jpg"
                        alt="Glory Share badge"
                        fill
                        className="rounded-full object-cover drop-shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
                      />
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="text-xs uppercase tracking-[0.5em] text-amber-200 drop-shadow">
                      {t("gloryShareBadge.label")}
                    </p>
                    <CardTitle className="text-2xl text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.45)]">
                      {t("gloryShareBadge.title")}
                    </CardTitle>
                    {joinedDate && (
                      <p className="text-sm text-purple-100">
                        {t("gloryShareBadge.joinedAt", { date: joinedDate })}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="text-sm text-purple-100 space-y-5">
                <p className="text-base text-white">{t("gloryShareBadge.description")}</p>

                <div className="grid gap-4 md:grid-cols-2">
                  {formattedAmount && (
                    <div className="rounded-2xl border border-amber-300/40 bg-linear-to-br from-amber-200/15 to-transparent p-4 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-200">
                        {t("gloryShareBadge.amountLabel")}
                      </p>
                      <p className="text-lg font-semibold text-white">{formattedAmount}</p>
                    </div>
                  )}
                  {gloryShare?.email && (
                    <div className="rounded-2xl border border-purple-300/40 bg-linear-to-br from-purple-200/15 to-transparent p-4 shadow-[0_0_18px_rgba(192,132,252,0.25)]">
                      <p className="text-xs uppercase tracking-[0.35em] text-purple-200">Email</p>
                      <p className="text-lg font-semibold text-white">{gloryShare.email}</p>
                    </div>
                  )}
                </div>

                {/* Hide perks first */}
                {/* 
                {gloryPerks.length > 0 && (
                  <ul className="grid gap-3 md:grid-cols-3">
                    {gloryPerks.map((perk) => (
                      <li
                        key={perk}
                        className="rounded-xl border border-primary/25 bg-gray-950/70 px-4 py-3 text-center text-sm text-white shadow-[0_0_18px_rgba(147,51,234,0.25)]"
                      >
                        {perk}
                      </li>
                    ))}
                  </ul>
                )} */}

                <Button
                  asChild
                  className="w-full text-black rounded-full bg-linear-to-r from-amber-300 via-amber-400 to-purple-500 hover:opacity-90"
                >
                  <Link href="/glory-share">{t("gloryShareBadge.cta")}</Link>
                </Button>
              </CardContent>
            </div>
          </div>
        </Card>
      )}

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="place-self-center">
            <Avatar className="w-24 h-24 md:h-48 md:w-48">
              <Image fill src={profile.photoURL!} alt={profile.displayName || ""} />
            </Avatar>
          </section>

          <section className="space-y-4">
            <h2 className="mb-2 text-xl font-semibold">{t("donator.title")}</h2>
            <p>
              <strong>{t("donator.email")}:</strong> {profile.email}
            </p>
            <p>
              <strong>{t("donator.name")}:</strong> {profile.displayName || ""}
            </p>
          </section>
        </CardContent>
        <CardFooter className="flex justify-center">{isOwnProfile && <SignOutButton />}</CardFooter>
      </Card>
    </motion.div>
  );
}
