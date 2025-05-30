import bibleArtworks from "@/data/bible-artworks-data";
import { assertIsDefined } from "@/lib/utils";
import { BibleArtwork, BibleArtworksLocale } from "@/types/bible-artwork";

const BibleArtworks = {
  data: bibleArtworks,

  getAll: async (): Promise<BibleArtwork[]> => {
    const res = await fetch("/api/bible-artworks", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch bible artworks from API");
    }
    return res.json();
  },

  toLocaleScripture: (
    artworks: BibleArtwork[],
    currentLanguage: string,
  ): BibleArtworksLocale[] => {
    assertIsDefined(currentLanguage, "currentLanguage is not defined");

    const localedArtworks = artworks.map((artwork) => {
      const scripture = currentLanguage.split("-").includes("zh")
        ? artwork.scriptures.zh ?? ""
        : artwork.scriptures.en ?? "";

      return {
        ...artwork,
        scripture,
        showDetailsByDefault: true,
      };
    });

    return localedArtworks;
  },

  toGrouped: (
    artworks: BibleArtworksLocale[],
  ): Record<string, BibleArtworksLocale[]> => {
    return artworks.reduce((acc, artwork) => {
      const book = artwork.book;
      return {
        ...acc,
        [book]: [...(acc[book] || []), artwork],
      };
    }, {} as Record<string, BibleArtworksLocale[]>);
  },
};

export default BibleArtworks;
