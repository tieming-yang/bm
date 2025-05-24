// This component uses useSearchParams and needs to be wrapped in Suspense
import { motion } from "framer-motion";
import type { Artwork } from "@/types/artwork";
import BibleArtwork from "@/data/bible-artworks";
import useTranslation from "@/hooks/useTranslation";
import { ImageGallery } from "./image-gallery";

export default function BibleGalleryContent() {
  const { t, currentLanguage } = useTranslation("gallery");

  const processedArtworks: Artwork[] = BibleArtwork.data.map((artwork) => {
    const scripture = currentLanguage.split("-").includes("zh")
      ? artwork.scripture.zh
      : artwork.scripture.en;

    const localizedCustomFields: Record<string, string | undefined> = {
      // Basic artwork properties with translated labels
      [t("bibleGallery.properties.year")]: artwork.year,
      [t("bibleGallery.properties.medium")]: artwork.medium,
      [t("bibleGallery.properties.dimensions")]: artwork.dimensions,
      // Scripture text and reference based on current language
      [t("bibleGallery.properties.scripture")]:
        currentLanguage === "zh-TW" ? artwork.scripture.zh.text : artwork.scripture.en.text,
      [t("bibleGallery.properties.reference")]: scripture.reference(),
    };

    if (artwork.location) {
      localizedCustomFields[t("bibleGallery.properties.location")] = artwork.location;
    }

    if (artwork.customFields?.["Biblical Period"]) {
      localizedCustomFields[t("bibleGallery.properties.biblicalPeriod")] =
        artwork.customFields["Biblical Period"];
    }

    if (artwork.customFields) {
      Object.entries(artwork.customFields).forEach(([key, value]) => {
        if (!localizedCustomFields[key] && value !== undefined) {
          localizedCustomFields[key] = value;
        }
      });
    }

    const filteredCustomFields: Record<string, string> = {};
    Object.entries(localizedCustomFields).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredCustomFields[key] = value;
      }
    });

    return {
      ...artwork,
      description: scripture.text,
      customFields: filteredCustomFields,
      showDetailsByDefault: true,
    };
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent mb-6">
          {t("bibleGallery.title")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("bibleGallery.subtitle")}
        </p>
      </motion.div>

      <ImageGallery artworks={processedArtworks} infiniteScroll={true} />
    </>
  );
}
