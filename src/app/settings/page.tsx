"use client";

import useFirebaseUser from "@/hooks/use-firebae-user";
import Donator from "@/models/donator";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import Image from "next/image";
import useTranslation from "@/hooks/useTranslation";
import SignOutButton from "../signout/signout-button";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      <Card className="md:w-[750px] w-[90%]">
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="place-self-center">
            <Avatar className="w-24 h-24 md:w-48 md:h-48">
              <AvatarImage src={donator?.photoURL!} alt={donator?.name || ""} />
              <AvatarFallback>{donator?.name}</AvatarFallback>
            </Avatar>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">{t("donator.title")}</h2>

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
          </section>
        </CardContent>
        <CardFooter className="flex justify-center">
          <SignOutButton />
        </CardFooter>
      </Card>
    </div>
  );
}
