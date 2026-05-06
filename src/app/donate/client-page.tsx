"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import useTranslation from "@/hooks/use-translation";

export default function ClientDonatePage() {
  const { t } = useTranslation("donate");

  return (
    <div className="container relative z-50 px-4 py-12 mx-auto min-h-svh">
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
          <Card className="border backdrop-blur-lg bg-card border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                {t("donate.card.zelle.title")}
              </CardTitle>
              <CardDescription>{t("donate.card.zelle.description")}</CardDescription>
            </CardHeader>
            <CardContent className="font-mono">{t("donate.card.zelle.account")}</CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
