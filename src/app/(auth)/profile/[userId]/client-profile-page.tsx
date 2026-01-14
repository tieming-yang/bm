"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import Loading from "@/app/loading";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import Profile from "@/models/profiles";
import { QueryKey } from "@/utils/query-keys";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { assertIsDefined } from "@/lib/utils";
import { toast } from "sonner";
import SignOutButton from "../../signout/signout-button";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Auth from "@/models/auth";
import Coupon from "@/models/coupons";

type Modal = "none" | "cancel" | "save";
type ErrorValues = { isError: boolean; message: string | null };
type Errors = Record<string, ErrorValues>;
export default function ClientProfilePage({ userId }: { userId: string }) {
  const router = useRouter();
  const { authUser } = useAuthUser();
  const { t, currentLanguage } = useTranslation("settings");
  const { t: tGloryShare } = useTranslation("glory-share");
  const { t: tCommon } = useTranslation("common");

  const [modal, setModal] = useState<Modal>("none");
  const [errors, setErrors] = useState<Errors>({
    email: {
      isError: false,
      message: null,
    },
  });
  const [updates, setUpdates] = useState({
    organizationEmail: "",
  });

  const query = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: QueryKey.profile(userId),
    queryFn: () => Profile.get(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!profile || !profile.email) return;

    setUpdates({
      organizationEmail: profile.organizationEmail ? profile.organizationEmail : profile.email,
    });
  }, [profile]);

  const isOwnProfile = profile && authUser?.uid === profile.uid;
  const isGloryShareMember = Profile.isGloryShareMember(profile);
  const locale = currentLanguage === "zh-TW" ? "zh-TW" : "en-US";

  const gloryShareEndAtSecs = profile?.subscriptions?.at(-1)?.currentPeriodEnd;
  const gloryShareEndAtDate = gloryShareEndAtSecs ? new Date(gloryShareEndAtSecs * 1000) : null;
  const gloryShareEndAtString = gloryShareEndAtDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(gloryShareEndAtDate)
    : "";
  const hasOrgEmailUpdated = profile && (profile.organizationEmailUpdateCount ?? 0) > 0;

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
      setModal("none");
      toast.success(t("gloryShareBadge.toast.cancelSuccessfully"));
      query.invalidateQueries({
        queryKey: QueryKey.profile(result.uid),
      });
    },
    onError: (error) => {
      console.error(error);
      setModal("none");
      if (error.message.includes("No such subscription:")) {
        toast.warning(t("gloryShareBadge.toast.canceledAlready"));
        return;
      }
      toast.error(t("gloryShareBadge.toast.cancelFailed"));
    },
  });

  const saveMutation = useMutation({
    mutationKey: ["profile"],
    mutationFn: async ({
      uid,
      newOrganizationEmail,
    }: {
      uid: string;
      newOrganizationEmail: string;
      currentCount: number;
    }) => {
      assertIsDefined(uid);
      assertIsDefined(newOrganizationEmail);

      try {
        const token = await Auth.user?.getIdToken();

        await fetch(`/api/profiles/${uid}/organization-email`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newOrganizationEmail }),
        });
      } catch (error) {
        throw error;
      }

      return { uid };
    },
    onSuccess: (result) => {
      setModal("none");
      toast.success(t("organization.toast.success"));
      query.invalidateQueries({
        queryKey: QueryKey.profile(result.uid),
      });
    },
    onError: (error) => {
      console.error(error);
      setModal("none");
      toast.error(t("organization.toast.error"));
    },
  });

  const {
    data: coupon,
    isPending: isCouponPending,
    error: couponError,
  } = useQuery({
    queryKey: [QueryKey.coupon(userId)],
    queryFn: () => Coupon.get(userId),
    enabled: isGloryShareMember,
    staleTime: Infinity,
  });

  if (isLoading || isCouponPending || !profile) {
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
                      {profile.uid === "9gD5LvY70wZzyQjNwEVnsnnfGf62"
                        ? "您是首位加入榮耀份額的成員，感謝您對藝術事奉的支持！"
                        : t("gloryShareBadge.label")}
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
                {!couponError && (
                  <Button
                    className="w-full max-w-md text-black runded-full bg-linear-to-r from-amber-300 via-amber-400 to-purple-500 hover:opacity-90 relative"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(coupon);
                        toast.success("專屬優惠折扣已複製到了您的剪貼簿！");
                      } catch (error) {
                        console.error("Copy failed", error);
                        toast.error("專屬優惠折扣複製失敗，請再試一次");
                      }
                    }}
                  >
                    {t("gloryShareBadge.copyCouponCode")}
                  </Button>
                )}

                {profile?.subscriptions?.at(-1)?.status !== "canceled" ? (
                  <Dialog open={modal === "cancel"}>
                    {profile.memberType === "monthly" ||
                      (profile.memberType === "yearly" && (
                        <DialogTrigger
                          id="cancel"
                          className="w-full max-w-md"
                          onClick={() => setModal("cancel")}
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
                          <Button variant="default" onClick={() => setModal("none")}>
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
            <p>
              <strong>{t("donator.type")}:</strong> {tCommon(`${profile.accountType}`) || ""}
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

      {/* Organization settings */}
      {isOwnProfile && isGloryShareMember && profile.accountType === "organization" && (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>{t("organization.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 place-self-center-safe gap-6">
            <section className="space-y-4">
              <div className="flex flex-col items-start md:flex-row gap-2">
                <Label htmlFor="organization-email" className="basis-1/3 text-xl">
                  {t("organization.emailLabel")}
                </Label>
                <div className="flex flex-col gap-2 w-full">
                  <Input
                    id="organization-email"
                    className="flex-1 font-mono w-full"
                    type="email"
                    value={updates.organizationEmail}
                    disabled={hasOrgEmailUpdated}
                    onChange={(e) => {
                      const updates = e.target.value;
                      const emailRegex = /^.+@.+\..+$/;
                      const isEmail = emailRegex.test(updates.trim());

                      let newError: ErrorValues = {
                        isError: false,
                        message: null,
                      };
                      if (!isEmail) {
                        newError.isError = true;
                        newError.message = "organization.invalidEmailFormat";
                      }
                      setErrors((prev) => {
                        return {
                          ...prev,
                          email: newError,
                        };
                      });

                      setUpdates((prev) => ({ ...prev, organizationEmail: updates }));
                    }}
                  ></Input>
                  {errors.email.isError && (
                    <p className="text-red-700">{t(errors.email.message ?? "")}</p>
                  )}
                </div>
              </div>
              <p>{t("organization.emailInstructionPrimary")}</p>
              <div className="text-foreground/90">
                <p className="italic">{t("organization.emailInstructionDefault")}</p>
                <p className="italic">
                  {t("organization.emailChangeLimitPrefix")}
                  <span className="text-red-500">
                    {t("organization.emailChangeLimitHighlight")}
                  </span>
                  {t("organization.emailChangeLimitSuffix")}
                </p>
              </div>
            </section>
          </CardContent>

          <CardFooter className="flex justify-center flex-col gap-y-3">
            {!hasOrgEmailUpdated ? (
              <Dialog open={modal === "save"}>
                <Button
                  variant={"default"}
                  disabled={
                    updates.organizationEmail === profile.organizationEmail ||
                    updates.organizationEmail === ""
                  }
                  onClick={() => {
                    const hasError = Object.values(errors).every((error) => error.isError === true);
                    if (hasError) {
                      toast.error(t("organization.invalidInputTitle"), {
                        description: t("organization.invalidInputDescription"),
                      });

                      return;
                    }

                    setModal("save");
                  }}
                >
                  {t("organization.save")}
                </Button>

                <DialogContent className="font-mono">
                  <DialogHeader>
                    <DialogTitle>{t("organization.confirmSaveTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("organization.confirmSaveDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant={"default"}
                      onClick={() => {
                        if (!profile || profile.organizationEmailUpdateCount === undefined) {
                          return;
                        }

                        saveMutation.mutate({
                          uid: profile.uid,
                          newOrganizationEmail: updates.organizationEmail,
                          currentCount: profile.organizationEmailUpdateCount,
                        });
                      }}
                    >
                      {t("organization.confirmSaveCta")}
                    </Button>
                    <DialogClose asChild>
                      <Button variant="secondary" onClick={() => setModal("none")}>
                        {t("organization.cancel")}
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="text-xl">
                <p>{t("organization.limitReached")}</p>
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </motion.div>
  );
}
