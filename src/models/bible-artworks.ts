import bibleArtworks from "@/data/bible-artworks-data";
import { BibleArtworksGrouped, BibleArtworksLocale } from "@/types/artwork";

const BibleArtworks = {
  data: bibleArtworks,

  toLocaleScripture: (
    currentLanguage: string,
  ): BibleArtworksLocale[] => {
    const localedArtworks = bibleArtworks.map((artwork) => {
      const scripture = currentLanguage.split("-").includes("zh")
        ? artwork.scripture.zh
        : artwork.scripture.en;

      return {
        ...artwork,
        scripture,
        description: scripture.text,
        showDetailsByDefault: true,
      };
    });

    return localedArtworks;
  },

  groupedByBook: (currentLanguage: string): BibleArtworksGrouped => {
    const localedArtworks = BibleArtworks.toLocaleScripture(currentLanguage);
    const grouped = localedArtworks.reduce(
      (acc, artwork) => {
        const book = artwork.scripture.book;
        return {
          ...acc,
          [book]: [...(acc[book] || []), artwork],
        };
      },
      {} as { [book: string]: BibleArtworksLocale[] },
    );

    return grouped;
  },
};

export default BibleArtworks;
