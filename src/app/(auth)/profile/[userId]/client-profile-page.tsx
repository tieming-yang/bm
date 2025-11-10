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
      className="flex flex-col items-center justify-center gap-8 px-4 py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="place-self-center">
            <Avatar className="h-24 w-24 md:h-48 md:w-48">
              <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName || ""} />
              <AvatarFallback>{profile.displayName}</AvatarFallback>
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

      {isGloryShareMember && (
        <Card className="w-full max-w-3xl border-primary/30 bg-linear-to-br from-primary/10 via-background to-background shadow-primary/20">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="relative h-50 w-50">
                <Image
                  src="/glory-share/join-success-badge.jpg"
                  alt="Glory Share badge"
                  fill
                  className="object-contain drop-shadow-lg rounded-full"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.5em] text-primary">
                  {t("gloryShareBadge.label")}
                </p>
                <CardTitle className="text-2xl">{t("gloryShareBadge.title")}</CardTitle>
                {joinedDate && (
                  <p className="text-sm text-muted-foreground">
                    {t("gloryShareBadge.joinedAt", { date: joinedDate })}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p className="text-base text-foreground">{t("gloryShareBadge.description")}</p>

            <div className="grid gap-4 md:grid-cols-2">
              {formattedAmount && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">
                    {t("gloryShareBadge.amountLabel")}
                  </p>
                  <p className="text-lg font-semibold text-foreground">{formattedAmount}</p>
                </div>
              )}
              {gloryShare?.email && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">Email</p>
                  <p className="text-lg font-semibold text-foreground">{gloryShare.email}</p>
                </div>
              )}
            </div>

            {/* {gloryPerks.length > 0 && (
              <ul className="grid gap-3 md:grid-cols-3">
                {gloryPerks.map((perk) => (
                  <li
                    key={perk}
                    className="rounded-xl border border-primary/15 bg-background/80 px-4 py-3 text-center text-sm text-foreground"
                  >
                    {perk}
                  </li>
                ))}
              </ul>
            )} */}

            <Button asChild className="w-full rounded-full">
              <Link href="/glory-share">{t("gloryShareBadge.cta")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
