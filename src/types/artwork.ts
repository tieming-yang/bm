import { StaticImageData } from "next/image";

export type Artwork = {
  id: string;
  title: string;
  description: string;
  year: string;
  medium: string;
  dimensions?: string;
  location?: string;
  imageUrl: StaticImageData;
  customFields?: Record<string, string | undefined>;
};

export type Scripture = {
  book: string; // e.g., "John"
  chapter: number; // e.g., 3
  verseStart: number; // e.g., 16
  verseEnd?: number; // Optional: e.g., 17 (if a range)
  chapterEnd?: number; // Optional: e.g., 4
  text: string; // English scripture text
  reference: () => string; // Function to get formatted reference
  theme?: string; // Optional thematic categorization
};

// Extended type for Bible-themed artworks
export type BibleArtwork = Artwork & {
  scripture: {
    en: Scripture;
    zh: Scripture; // Optional Chinese scripture
  };
};

export type BibleArtworksLocale = Artwork & {
  scripture: Scripture;
};

export type BibleArtworksGrouped = {
  [book: string]: BibleArtworksLocale[];
};

// Helper function to check if an artwork is a Bible artwork
export function isBibleArtwork(artwork: Artwork): artwork is BibleArtwork {
  return "scriptureReference" in artwork && "scriptureTextEn" in artwork;
}
