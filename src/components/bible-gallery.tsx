"use client";

// This component uses useSearchParams and needs to be wrapped in Suspense
import { motion } from "framer-motion";
import type { Artwork, BibleArtwork, BibleArtworksLocale } from "@/types/artwork";
import useTranslation from "@/hooks/useTranslation";
import { ImageGallery } from "./image-gallery";
import BibleArtworks from "@/models/bible-artworks";

export default function BibleGalleryContent() {
  const { t, currentLanguage } = useTranslation("gallery");

  const localedArtworks: BibleArtworksLocale[] = BibleArtworks.toLocaleScripture(currentLanguage);
  const localedGroudedArtworks = BibleArtworks.groupedByBook(currentLanguage);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          {t("bibleGallery.title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("bibleGallery.subtitle")}
        </p>
      </motion.div>

      <ImageGallery
        bibleArtworks={localedArtworks}
        groupedBibleArtworks={localedGroudedArtworks}
        infiniteScroll={true}
      />
    </>
  );
}
