"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import useTranslation from "../../hooks/useTranslation";

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6">
          {t("about.title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("about.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="relative h-[500px] w-full rounded-3xl overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1508186225823-0963cf9ab0de?q=80&w=1000"
              alt="楊毅"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-3xl font-bold">{t("about.founder.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("about.founder.description1")}</p>
          <p className="text-lg text-muted-foreground">{t("about.founder.description2")}</p>
          <p className="text-lg text-muted-foreground">{t("about.founder.description3")}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-24 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-lg rounded-3xl p-8 border border-primary/10"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">{t("about.mission.title")}</h2>
        <p className="text-lg text-muted-foreground text-center max-w-4xl mx-auto">
          {t("about.mission.description")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-24 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-lg rounded-3xl p-8 border border-primary/10"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">{t("about.vision.title")}</h2>
        <p className="text-lg text-muted-foreground text-center max-w-4xl mx-auto">
          {t("about.vision.description")}
        </p>
      </motion.div>
    </div>
  );
}
