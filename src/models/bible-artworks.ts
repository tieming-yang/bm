import bibleArtworks from "@/data/bible-artworks-data";
import Books, { type Book } from "@/data/books";
import { assertIsDefined } from "@/lib/utils";
import {
  BibleArtwork,
  BibleArtworksCanonical,
  BibleArtworksLocale,
  GroupedArtworks,
} from "@/types/bible-artwork";
import Config from "./config";

const createEmptyGroupedArtworks = (): GroupedArtworks => {
  return Books.order.reduce((acc, book) => {
    acc[book] = [];
    return acc;
  }, {} as GroupedArtworks);
};

const BibleArtworks = {
  data: bibleArtworks,
  order: Books.order,

  getAll: async (): Promise<BibleArtwork[]> => {
    const res = await fetch(`${Config.baseUrl}/api/bible-artworks`, { cache: "force-cache" });
    if (!res.ok) {
      throw new Error("Failed to fetch bible artworks from API");
    }
    return res.json();
  },

  toLocaleScripture: (artworks: BibleArtwork[], currentLanguage: string): BibleArtworksLocale[] => {
    assertIsDefined(artworks, "artworks is not defined");
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

  toGrouped: (artworks: BibleArtworksLocale[]): GroupedArtworks => {
    return artworks.reduce((acc, artwork) => {
      acc[artwork.book] = [...acc[artwork.book], artwork];
      return acc;
    }, createEmptyGroupedArtworks());
  },

  toSoredGroupsCanonical: (
    grouped: GroupedArtworks,
    order: readonly Book[]
  ): BibleArtworksCanonical => {
    return order
      .filter((bookName) => grouped[bookName].length > 0)
      .map((bookName) => [bookName, grouped[bookName]]);
  },

  toFreeArtworks: (groupedArtworks: GroupedArtworks): GroupedArtworks => {
    return Books.order.reduce((acc, book) => {
      acc[book] = groupedArtworks[book].slice(0, 3);
      return acc;
    }, createEmptyGroupedArtworks());
  },
};

export default BibleArtworks;
