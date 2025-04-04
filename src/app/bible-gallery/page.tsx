"use client";

import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import useTranslation from "../../hooks/useTranslation";
import { bibleArtworks } from "../../data/bible-artworks";
import { ImageGallery } from "../../components/image-gallery";
import { useSearchParams } from "next/navigation";
import type { Artwork } from "@/types/artwork";
import { translateBibleReference } from "@/utils/bible-utils";

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

  // Map Bible artworks to standard Artwork format for the ImageGallery component
  const processedArtworks: Artwork[] = bibleArtworks.map((artwork) => {
    // Get translated reference if in Chinese mode
    const translatedReference =
      currentLanguage === "zh-TW"
        ? translateBibleReference(artwork.scriptureReference)
        : artwork.scriptureReference;

    // Create localized custom fields with translated labels
    const localizedCustomFields: Record<string, string | undefined> = {
      // Basic artwork properties with translated labels
      [t("bibleGallery.properties.year")]: artwork.year,
      [t("bibleGallery.properties.medium")]: artwork.medium,
      [t("bibleGallery.properties.dimensions")]: artwork.dimensions,
      // Scripture text and reference based on current language
      [t("bibleGallery.properties.scripture")]:
        currentLanguage === "zh-TW" ? artwork.scriptureTextZh : artwork.scriptureTextEn,
      [t("bibleGallery.properties.reference")]: translatedReference,
    };

    // Add location if available
    if (artwork.location) {
      localizedCustomFields[t("bibleGallery.properties.location")] = artwork.location;
    }

    // Add biblical period if available
    if (artwork.customFields?.["Biblical Period"]) {
      localizedCustomFields[t("bibleGallery.properties.biblicalPeriod")] =
        artwork.customFields["Biblical Period"];
    }

    // Add any other custom fields
    if (artwork.customFields) {
      Object.entries(artwork.customFields).forEach(([key, value]) => {
        if (!localizedCustomFields[key] && value !== undefined) {
          localizedCustomFields[key] = value;
        }
      });
    }

    // Filter out any undefined values
    const filteredCustomFields: Record<string, string> = {};
    Object.entries(localizedCustomFields).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredCustomFields[key] = value;
      }
    });

    return {
      ...artwork,
      // Add scripture reference to description if not already included
      description: artwork.description.includes(artwork.scriptureReference)
        ? artwork.description
        : `${artwork.description} (${translatedReference})`,
      // Use our filtered custom fields
      customFields: filteredCustomFields,
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
        <ImageGallery artworks={processedArtworks} infiniteScroll={true} />
      </Suspense>
    </div>
  );
}
