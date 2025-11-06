"use client";

import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Heart } from "lucide-react";
import useTranslation from "../../hooks/use-translation";
import useAuthUser from "@/hooks/use-auth-user";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import Loading from "@/components/loading";

export default function Donate() {
  const { t } = useTranslation("donate");
  const { t: tCommon } = useTranslation("common");
  const { authUser, isAuthUserLoading } = useAuthUser();
  const router = useRouter();
  const path = usePathname();

  if (isAuthUserLoading) {
    return <Loading />;
  }
  if (!authUser) {
    toast.error(tCommon("toast.mustSignIn"));

    router.push(`/signin?redirectTo=${encodeURIComponent(path)}`);
  }

  return (
    <div className="container px-4 py-12 mx-auto relative z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-linear-to-r from-primary to-secondary bg-clip-text">
          {t("donate.title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
          {t("donate.subtitle")}
        </p>
      </motion.div>

      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="border backdrop-blur-lg bg-background/80 border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                {t("donate.card.title")}
              </CardTitle>
              <CardDescription>{t("donate.card.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t("donate.card.amount")}</Label>
                <RadioGroup defaultValue="50" className="flex flex-wrap gap-4">
                  <div>
                    <RadioGroupItem value="25" id="amount-25" className="sr-only peer" />
                    <Label
                      htmlFor="amount-25"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      $25
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="50" id="amount-50" className="sr-only peer" />
                    <Label
                      htmlFor="amount-50"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      $50
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="100" id="amount-100" className="sr-only peer" />
                    <Label
                      htmlFor="amount-100"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      $100
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="custom" id="amount-custom" className="sr-only peer" />
                    <Label
                      htmlFor="amount-custom"
                      className="flex cursor-pointer items-center justify-center rounded-3xl border-2 border-muted bg-popover px-6 py-2 text-center font-medium ring-offset-background peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                    >
                      {t("donate.card.custom")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("donate.card.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("donate.card.name_placeholder")}
                  className="rounded-3xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("donate.card.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("donate.card.email_placeholder")}
                  className="rounded-3xl"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-3xl">{t("donate.card.complete")}</Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
