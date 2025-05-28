"use client";

import { motion } from "framer-motion";
import { Suspense } from "react";
import useTranslation from "../hooks/useTranslation";
import Loading from "@/components/loading";
import BibleBooks from "../components/bible-books";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="container flex flex-col gap-y-12 mx-auto px-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col justify-center items-center gap-y-5 h-svh"
      >
        {/* <h1 className="text-xl font-serif md:text-2xl font-bold">{t("home.title")}</h1> */}
        <h2 className="md:text-5xl  sm:text-3xl text-2xl transition-all duration-300 flex text-center flex-col gap-y-4 md:gap-y-7 xl:text-7xl">
          {t("home.subtitle")
            .split("\n")
            .map((line, index) => (
              <span key={index}>
                {line}
                <br />
              </span>
            ))}
        </h2>
      </motion.div>

      <Suspense fallback={<Loading />}>
        <BibleBooks />
      </Suspense>
    </div>
  );
}
