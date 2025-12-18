"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, progressPercentage } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Loading from "@/app/loading";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import Profile from "@/models/profiles";
import { QueryKey } from "@/utils/query-keys";

import SignOutButton from "../../signout/signout-button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { assertIsDefined } from "@/lib/utils";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientProfilePage({ userId }: { userId: string }) {
  const router = useRouter();
  const { authUser } = useAuthUser();
  const { t, currentLanguage } = useTranslation("settings");
  const { t: tGloryShare } = useTranslation("glory-share");

  const [isCancelModalOpen, setIsCancelModelOpen] = useState(false);

  const query = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: QueryKey.profile(userId),
    queryFn: () => Profile.get(userId),
    enabled: !!userId,
  });

  const isOwnProfile = profile && authUser?.uid === profile.uid;
  const isGloryShareMember = Profile.isGloryShareMember(profile);
  const locale = currentLanguage === "zh-TW" ? "zh-TW" : "en-US";

  const gloryShareEndAtSecs = profile?.subscriptions?.at(-1)?.currentPeriodEnd;
  const gloryShareEndAtDate = gloryShareEndAtSecs ? new Date(gloryShareEndAtSecs * 1000) : null;
  const gloryShareEndAtString = gloryShareEndAtDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(gloryShareEndAtDate)
    : "";

  const cancelMutation = useMutation<
    { uid: string },
    Error,
    { uid: string; subscriptionId: string }
  >({
    mutationKey: ["glory-share", "profile"],
    mutationFn: async ({ uid, subscriptionId }) => {
      assertIsDefined(uid);
      assertIsDefined(subscriptionId);
      const payload = { uid };

      try {
        const rawResponse = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const response = await rawResponse.json();
        if (!rawResponse.ok) {
          console.debug(response);
          throw new Error(response?.error);
        }
      } catch (error) {
        throw error;
      }

      return { uid };
    },
    onSuccess: (result) => {
      setIsCancelModelOpen((prev) => !prev);
      toast.success(t("gloryShareBadge.toast.cancelSuccessfully"));
      query.invalidateQueries({
        queryKey: QueryKey.profile(result.uid),
      });
    },
    onError: (error) => {
      console.error(error);
      setIsCancelModelOpen((prev) => !prev);
      if (error.message.includes("No such subscription:")) {
        toast.warning(t("gloryShareBadge.toast.canceledAlready"));
        return;
      }
      toast.error(t("gloryShareBadge.toast.cancelFailed"));
    },
  });

  if (isLoading || !profile) {
    return <Loading />;
  }

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
                  </div>
                </div>
              </CardHeader>

              <CardContent className="text-sm text-purple-100 space-y-5">
                <p className="text-base text-white">{t("gloryShareBadge.description")}</p>
              </CardContent>
              <CardFooter className="flex flex-col gap-y-2 items-center-safe">
                <Button
                  asChild
                  className="w-full max-w-md text-black runded-full bg-linear-to-r from-amber-300 via-amber-400 to-purple-500 hover:opacity-90"
                >
                  <Link href="/glory-share">{t("gloryShareBadge.cta")}</Link>
                </Button>
                {profile?.subscriptions?.at(-1)?.status !== "canceled" ? (
                  <Dialog open={isCancelModalOpen}>
                    {profile.memberType === "monthly" ||
                      (profile.memberType === "yearly" && (
                        <DialogTrigger
                          className="w-full max-w-md"
                          onClick={() => setIsCancelModelOpen((prev) => !prev)}
                        >
                          {t("gloryShareBadge.cancelGloryShare")}
                        </DialogTrigger>
                      ))}

                    <DialogContent className="font-mono">
                      <DialogHeader>
                        <DialogTitle>{t("gloryShareBadge.cancelGloryShareTitle")}</DialogTitle>
                        <DialogDescription>
                          {t("gloryShareBadge.cancelGloryShareDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant={"destructive"}
                          // className="w-full max-w-md"
                          onClick={() => {
                            if (!profile || !profile.uid || !profile.lastSubscriptionId) {
                              console.error("Missing necessary arguments");
                              return;
                            }
                            cancelMutation.mutate({
                              uid: profile.uid,
                              subscriptionId: profile.lastSubscriptionId,
                            });
                          }}
                        >
                          {t("gloryShareBadge.cancelGloryShare")}
                        </Button>
                        <DialogClose asChild>
                          <Button
                            variant="default"
                            onClick={() => setIsCancelModelOpen((prev) => !prev)}
                          >
                            {t("gloryShareBadge.continueSupport")}
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  profile?.memberType !== "lifeTime" && (
                    <div>
                      <span>{t("gloryShareBadge.gloryShareWillBeEndedAt")}</span>{" "}
                      <span>{gloryShareEndAtString}</span>
                    </div>
                  )
                )}
              </CardFooter>
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
        {isOwnProfile && (
          <CardFooter className="flex justify-center flex-col gap-y-3">
            {!isGloryShareMember && (
              <Button
                variant={"secondary"}
                className="px-8 rounded-full text-gray-900"
                onClick={() => {
                  router.push("/glory-share/join");
                }}
              >
                {tGloryShare("gloryShare.hero.primaryCta")}
              </Button>
            )}

            <SignOutButton />
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
