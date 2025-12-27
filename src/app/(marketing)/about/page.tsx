"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Trans } from "react-i18next";
import useTranslation from "@/hooks/use-translation";
import Intro from "../../../components/intro";

export default function About() {
  const { t } = useTranslation();
  const story = t("about.story", { returnObjects: true }) as string[];

  return (
    <div className="container relative z-50 px-4 py-12 mx-auto font-serif">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <Intro i18nKey="about.intro" />
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-linear-to-r from-primary to-secondary bg-clip-text">
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
            <Image src="/logos/logo.webp" alt="Logo" fill className="object-cover" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-6"
        >
          {story.map((_, index) => (
            <p key={index} className="text-lg text-muted-foreground">
              <Trans
                i18nKey={`about.story.${index}`}
                components={{ bold: <strong className="font-semibold text-foreground" /> }}
              />
            </p>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
