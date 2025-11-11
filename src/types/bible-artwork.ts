import { StaticImageData } from "next/image";
import type { Book } from "@/data/books";

export type BibleArtwork = {
  id: string;
  title?: string;
  description?: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  location?: string;
  imageUrl: StaticImageData;
  customFields?: Record<string, string | undefined>;
  book: Book;
  section: string;
  scriptures: Scriptures;
};

export type Scriptures = {
  en?: string;
  zh?: string;
};

type Scripture = string;

export type BibleArtworksLocale = Omit<BibleArtwork, "scriptures"> & {
  scripture: Scripture;
};

export type GroupedArtworks = Record<Book, BibleArtworksLocale[]>;

export type BibleArtworksCanonical = Array<[Book, BibleArtworksLocale[]]>;

// Helper function to check if an artwork is a Bible artwork
export function isBibleArtwork(artwork: BibleArtwork): artwork is BibleArtwork {
  return "scriptureReference" in artwork && "scriptureTextEn" in artwork;
}
