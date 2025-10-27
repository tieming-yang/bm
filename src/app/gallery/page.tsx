"use client";

import { motion } from "framer-motion";
import { ImageGallery } from "../../components/image-gallery";
import { artworks } from "../../models/artworks";
import { Suspense } from "react";
import useTranslation from "../../hooks/useTranslation";
import Loading from "@/components/loading";

export default function Gallery() {
  const { t } = useTranslation("gallery");

  return (
    <div className="container px-4 py-12 mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-linear-to-r from-primary to-pink-500 bg-clip-text">
          {t("gallery.title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
          {t("gallery.subtitle")}
        </p>
      </motion.div>

      <Suspense fallback={<Loading />}>
        <ImageGallery bibleArtworks={artworks} infiniteScroll={true} />
      </Suspense>
    </div>
  );
}
