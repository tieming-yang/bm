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
      {
        [
          { id: "1", title: "Creation", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "2", title: "The Flood", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "3", title: "The Exodus", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "4", title: "The Ten Commandments", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "5", title: "David and Goliath", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "6", title: "The Nativity", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "7", title: "The Passover", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "8", title: "The Last Supper", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "9", title: "The Crucifixion", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "10", title: "The Resurrection", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
          { id: "11", title: "The Ascension", imageUrl: "/paintings/Exodus/Exodus1:1-22.webp" },
        ].map((artwork) => (
          <Image
            key={artwork.id}
            src={artwork.imageUrl}
            alt={artwork.title}
            width={800}
            height={600}
            className="mb-4 rounded-md shadow-lg"
          />
        ))
      }
    </div>
  );
}
