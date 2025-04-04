export type Artwork = {
  id: string;
  title: string;
  description: string;
  year: string;
  medium: string;
  dimensions: string;
  location?: string;
  imageUrl: string;
  customFields?: Record<string, string>;
};

// Bible scripture reference structure
export type BibleScripture = {
  reference: string; // e.g., "John 3:16-17"
  textEn: string; // English text of the verse
  textZh: string; // Chinese text of the verse
  book?: string; // Optional: Book name (e.g., "John")
  chapter?: number; // Optional: Chapter number
  verseStart?: number; // Optional: Starting verse number
  verseEnd?: number; // Optional: Ending verse number (if range)
};

// Extended type for Bible-themed artworks
export type BibleArtwork = Artwork & {
  scriptures: BibleScripture[]; // One artwork can reference multiple scriptures
  bibleTheme?: string; // Optional thematic categorization
};
