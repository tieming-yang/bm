"use client";

import { motion } from "framer-motion";
import useTranslation from "@/hooks/useTranslation";
import { ImageGallery } from "./image-gallery";
import BibleArtworks from "@/models/bible-artworks";
import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import { toast } from "sonner";
import bibleArtworks from "@/data/bible-artworks-data";
import Image from "next/image";
export default function BibleGalleryContent({ params }: { params?: { book?: string } }) {
  const { t, currentLanguage } = useTranslation("gallery");
  const { t: tUI } = useTranslation("ui");
  const book = params?.book;

  const {
    data: artworks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bibleArtworks", currentLanguage],
    queryFn: () => BibleArtworks.getAll(),
  });

  if (isLoading) {
    return <Loading />;
  }

  if (error || !artworks) {
    toast.error(tUI("loading.error.title"), {
      description: tUI("loading.error.message"),
    });
  }

  const localedArtworks = BibleArtworks.toLocaleScripture(artworks!, currentLanguage);
  const groupedArtworks = BibleArtworks.toGrouped(localedArtworks);
  const sortedCanonicalBooks = BibleArtworks.toSoredGroupsCanonical(
    groupedArtworks,
    BibleArtworks.order
  );
  //! test if fetch from not next api route works...
  return (
    <div className="z-50 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-gradient-to-r from-primary to-secondary bg-clip-text">
          {t("bibleGallery.title")}
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
          {t("bibleGallery.subtitle")}
        </p>
      </motion.div>

      {/* <ImageGallery
        bibleArtworks={localedArtworks}
        groupedBibleArtworks={sortedCanonicalBooks}
        infiniteScroll={false}
        book={book}
      /> */}
    </div>
  );
}
