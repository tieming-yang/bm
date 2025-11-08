"use client";

import useAuthUser from "@/hooks/use-auth-user";
import { useQuery } from "@tanstack/react-query";
import Loading from "@/app/loading";
import useTranslation from "@/hooks/use-translation";
import SignOutButton from "../../signout/signout-button";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import Profile from "@/models/profiles";
import { QueryKey } from "@/utils/query-keys";

export default function ClientProfilePage(props: { userId: string }) {
  const { userId } = props;

  const { authUser, isAuthUserLoading, authUserError } = useAuthUser();
  const { t } = useTranslation("settings");

  const { data: profile, isLoading } = useQuery({
    queryKey: QueryKey.profile(userId),
    queryFn: () => Profile.get(userId),
    enabled: !!userId,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-dvh relative z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Card className="md:w-[750px] w-[90%]">
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="place-self-center">
            <Avatar className="w-24 h-24 md:w-48 md:h-48">
              <AvatarImage src={profile?.photoURL!} alt={profile?.displayName || ""} />
              <AvatarFallback>{profile?.displayName}</AvatarFallback>
            </Avatar>
          </section>

          <section className="space-y-4">
            <h2 className="mb-2 text-xl font-semibold">{t("donator.title")}</h2>

            <p>
              <strong>{t("donator.email")}:</strong> {profile?.email}
            </p>
            <p>
              <strong>{t("donator.name")}:</strong> {profile?.displayName || ""}
            </p>
          </section>
        </CardContent>
        <CardFooter className="flex justify-center">
          {authUser && authUser.uid === profile?.uid && <SignOutButton />}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
