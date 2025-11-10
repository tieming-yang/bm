"use client";

import useTranslation from "@/hooks/use-translation";
import { motion } from "framer-motion";
import React from "react";
import BibleBooks from "../components/bible-books";

type Props = {};

export default function ClientHome({}: Props) {
  const { t } = useTranslation();
  return (
    <div className="relative z-20">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center justify-center w-full px-3 mx-auto text-transparent gap-y-5 h-svh bg-linear-to-r from-primary to-secondary bg-clip-text"
      >
        <h1 className="flex flex-col text-2xl text-center md:text-5xl sm:text-3xl transition-all duration-300 gap-y-16 md:gap-y-12 xl:text-7xl">
          {t("home.subtitle")
            .split("\n")
            .map((line, index) => (
              <motion.span
                key={index}
                className=""
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                {line}
                <br />
              </motion.span>
            ))}
        </h1>
      </motion.section>

      <h2 className="mb-5 text-2xl text-center">{t("nav.bibleGallery")}</h2>
      <BibleBooks />
    </div>
  );
}
