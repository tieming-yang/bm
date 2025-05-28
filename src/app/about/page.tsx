"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import useTranslation from "../../hooks/useTranslation";

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="container px-4 py-12 mx-auto relative z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-gradient-to-r from-primary to-secondary bg-clip-text">
          {t("about.title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
          {t("about.subtitle")}
        </p>
      </motion.div>

      <div className="items-center grid grid-cols-1 md:grid-cols-2 gap-12">
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
        className="p-8 mt-24 border bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-lg rounded-3xl border-primary/10"
      >
        <h2 className="mb-6 text-3xl font-bold text-center">{t("about.mission.title")}</h2>
        <p className="max-w-4xl mx-auto text-lg text-center text-muted-foreground">
          {t("about.mission.description")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="p-8 mt-24 border bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-lg rounded-3xl border-primary/10"
      >
        <h2 className="mb-6 text-3xl font-bold text-center">{t("about.vision.title")}</h2>
        <p className="max-w-4xl mx-auto text-lg text-center text-muted-foreground">
          {t("about.vision.description")}
        </p>
      </motion.div>
    </div>
  );
}
