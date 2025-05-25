"use client";

import useFirebaseUser from "@/hooks/use-firebae-user";
import Donator from "@/models/donator";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import Image from "next/image";
import useTranslation from "@/hooks/useTranslation";
import SignOutButton from "../signout/signout-button";

type Props = {};

export default function SettingsPage({}: Props) {
  const { user, initializing } = useFirebaseUser();
  const router = useRouter();
  const { t } = useTranslation("settings");
  const { t: commonT } = useTranslation("common");

  const { data: donator, isLoading } = useQuery({
    queryKey: ["donator", user?.uid],
    queryFn: () => Donator.get(user!.uid),
    enabled: !!user,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh">
      <h1 className="text-3xl font-bold mb-4">{t("settings.title")}</h1>
      <div className="w-full max-w-md p-4 space-y-5 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">{t("donator.title")}</h2>
        <Image src={donator?.photoURL || ""} alt={donator?.name || ""} width={100} height={100} />
        <p>
          <strong>{t("donator.email")}:</strong> {donator?.email}
        </p>
        <p>
          <strong>{t("donator.name")}:</strong> {donator?.name || ""}
        </p>
        <p>
          <strong>{t("donator.total")}:</strong> {donator?.totalDonated}
        </p>
        <p>
          <strong>{t("donator.preferredLanguage")}:</strong> {donator?.preferredLanguage || ""}
        </p>
        <p>
          <strong>{t("donator.newsletter")}:</strong>{" "}
          {donator?.newsletterOptIn ? commonT("yes") : commonT("no")}
        </p>
      </div>

      <SignOutButton />
    </div>
  );
}
