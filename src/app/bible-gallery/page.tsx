"use client";

import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import useTranslation from "../../hooks/useTranslation";
import { bibleArtworks } from "../../data/bible-artworks";
import { ImageGallery } from "../../components/image-gallery";
import { useSearchParams } from "next/navigation";

export default function BibleGallery() {
  const { t } = useTranslation("gallery");
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const searchParams = useSearchParams();

  // Detect current language
  useEffect(() => {
    // Use document.documentElement.lang or localStorage as fallback
    const lang = document.documentElement.lang || localStorage.getItem("i18nextLng") || "en";
    setCurrentLanguage(lang.includes("zh") ? "zh-TW" : "en");
  }, []);

  // Map Bible artworks to include the appropriate scripture based on locale
  // and translate property names for display
  const artworksWithScripture = bibleArtworks.map((artwork) => {
    // Create localized custom fields with translated property names
    const localizedCustomFields: Record<string, string> = {};

    // Add basic artwork properties with translated labels
    localizedCustomFields[t("bibleGallery.properties.year")] = artwork.year;
    localizedCustomFields[t("bibleGallery.properties.medium")] = artwork.medium;
    localizedCustomFields[t("bibleGallery.properties.dimensions")] = artwork.dimensions;

    if (artwork.location) {
      localizedCustomFields[t("bibleGallery.properties.location")] = artwork.location;
    }

    // Add scripture in current language
    localizedCustomFields[t("bibleGallery.properties.scripture")] =
      currentLanguage === "zh-TW"
        ? artwork.scriptures[0]?.textZh || ""
        : artwork.scriptures[0]?.textEn || "";

    localizedCustomFields[t("bibleGallery.properties.reference")] =
      artwork.scriptures[0]?.reference || "";

    // Add any additional custom fields with translated labels if possible
    if (artwork.customFields) {
      Object.entries(artwork.customFields).forEach(([key, value]) => {
        // Try to translate known custom field keys
        const translatedKey =
          key === "Biblical Period" ? t("bibleGallery.properties.biblicalPeriod") : key;

        localizedCustomFields[translatedKey] = value;
      });
    }

    return {
      ...artwork,
      // Add scripture reference to description if not already included
      description: artwork.description.includes(artwork.scriptures[0]?.reference || "")
        ? artwork.description
        : `${artwork.description} (${artwork.scriptures[0]?.reference || ""})`,
      // Use our localized custom fields
      customFields: localizedCustomFields,
      // This flag tells our component to show details by default
      showDetailsByDefault: true,
    };
  });

  return (
    <div className="container mx-auto px-4 py-12">
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

      <Suspense>
        <ImageGallery artworks={artworksWithScripture} infiniteScroll={true} />
      </Suspense>
    </div>
  );
}
