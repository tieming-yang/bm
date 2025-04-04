export type Artwork = {
  id: string;
  title: string;
  description: string;
  year: string;
  medium: string;
  dimensions?: string;
  location?: string;
  imageUrl: string;
  customFields?: Record<string, string | undefined>;
};

// Extended type for Bible-themed artworks
export type BibleArtwork = Artwork & {
  // Scripture data directly in the artwork
  scriptureReference: string; // e.g., "John 3:16-17"
  scriptureTextEn: string; // English text
  scriptureTextZh: string; // Chinese text
  bibleBook: string; // e.g., "John", "Genesis"
  bibleChapter: number; // e.g., 3
  bibleVerseStart: number; // e.g., 16
  bibleVerseEnd?: number; // Optional: e.g., 17 (if a range)
  bibleTheme?: string; // Optional thematic categorization
};

// Helper function to check if an artwork is a Bible artwork
export function isBibleArtwork(artwork: Artwork): artwork is BibleArtwork {
  return "scriptureReference" in artwork && "scriptureTextEn" in artwork;
}
