"use client";

import { motion } from "framer-motion";
import { ImageGallery } from "../components/image-gallery";
import { artworks } from "../models/artworks";
import { Suspense } from "react";
import useTranslation from "../hooks/useTranslation";
import BibleGalleryContent from "@/components/bible-gallery";
import Loading from "@/components/loading";
import BibleBooks from "../components/bible-books";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-3 py-12 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-5xl font-serif md:text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6">
          {t("home.title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("home.subtitle")}
        </p>
      </motion.div>

      <Suspense fallback={<Loading />}>
        <BibleBooks />
      </Suspense>
    </div>
  );
}
