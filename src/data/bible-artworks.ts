import type { BibleArtwork, BibleScripture } from "@/types/artwork";

// Example Bible scripture data
const genesisScriptures: BibleScripture[] = [
  {
    reference: "Genesis 1:1-2",
    book: "Genesis",
    chapter: 1,
    verseStart: 1,
    verseEnd: 2,
    textEn:
      "In the beginning God created the heavens and the earth. Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
    textZh: "起初，神創造天地。地是空虛混沌，淵面黑暗；神的靈運行在水面上。",
  },
];

const johnScriptures: BibleScripture[] = [
  {
    reference: "John 3:16",
    book: "John",
    chapter: 3,
    verseStart: 16,
    verseEnd: 16,
    textEn:
      "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    textZh: "神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不致滅亡，反得永生。",
  },
];

const psalmScriptures: BibleScripture[] = [
  {
    reference: "Psalm 23:1-3",
    book: "Psalm",
    chapter: 23,
    verseStart: 1,
    verseEnd: 3,
    textEn:
      "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
    textZh:
      "耶和華是我的牧者，我必不致缺乏。他使我躺臥在青草地上，領我在可安歇的水邊。他使我的靈魂甦醒，為自己的名引導我走義路。",
  },
];

// Bible artwork collection
export const bibleArtworks: BibleArtwork[] = [
  {
    id: "bible-1",
    title: "Creation",
    description: "An artistic representation of the creation of the world as described in Genesis.",
    year: "2023",
    medium: "Oil on canvas",
    dimensions: "120 × 90 cm",
    imageUrl: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    scriptures: genesisScriptures,
    bibleTheme: "Creation",
    customFields: {
      "Biblical Period": "Beginning",
      "Scripture Reference": "Genesis 1:1-2",
    },
  },
  {
    id: "bible-2",
    title: "Salvation",
    description: "A visual meditation on God's love and the gift of salvation.",
    year: "2023",
    medium: "Digital art",
    dimensions: "4K Resolution",
    imageUrl: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    scriptures: johnScriptures,
    bibleTheme: "Salvation",
    customFields: {
      "Biblical Period": "New Testament",
      "Scripture Reference": "John 3:16",
    },
  },
  {
    id: "bible-3",
    title: "The Good Shepherd",
    description: "An exploration of God's guidance and provision as described in Psalm 23.",
    year: "2023",
    medium: "Watercolor on paper",
    dimensions: "60 × 40 cm",
    imageUrl: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    scriptures: psalmScriptures,
    bibleTheme: "Guidance",
    customFields: {
      "Biblical Period": "Old Testament",
      "Scripture Reference": "Psalm 23:1-3",
    },
  },
];

// Helper function to get all Bible artworks
export function getBibleArtworks(): BibleArtwork[] {
  return bibleArtworks;
}

// Helper function to get artwork by ID
export function getBibleArtworkById(id: string): BibleArtwork | undefined {
  return bibleArtworks.find((artwork) => artwork.id === id);
}

// Helper function to get artworks by theme
export function getBibleArtworksByTheme(theme: string): BibleArtwork[] {
  return bibleArtworks.filter((artwork) => artwork.bibleTheme === theme);
}

// Helper function to get artworks by book
export function getBibleArtworksByBook(book: string): BibleArtwork[] {
  return bibleArtworks.filter((artwork) =>
    artwork.scriptures.some((scripture) => scripture.book === book)
  );
}
