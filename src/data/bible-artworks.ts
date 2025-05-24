import type { BibleArtwork } from "@/types/artwork";
import { randomUUID } from "crypto";

// Bible artwork collection
export const bibleArtworks: BibleArtwork[] = [
  {
    id: randomUUID(),
    title: "Creation",
    description:
      "An artistic representation of the creation of the world as described in Genesis.",
    year: "2023",
    medium: "Oil on canvas",
    imageUrl:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    // Scripture data
    scripture: {
      scriptureReference: "Genesis 1:1-2",
      scriptureTextEn:
        "In the beginning God created the heavens and the earth. Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
      scriptureTextZh:
        "起初，神創造天地。地是空虛混沌，淵面黑暗；神的靈運行在水面上。",
      bibleBook: "Genesis",
      bibleChapter: 1,
      bibleVerseStart: 1,
      bibleVerseEnd: 2,
      bibleTheme: "Creation",
    },
    customFields: {
      "Biblical Period": "Beginning",
    },
  },
  {
    id: randomUUID(),
    title: "Salvation",
    description: "A visual meditation on God's love and the gift of salvation.",
    year: "2023",
    medium: "Digital art",
    imageUrl:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    // Scripture data
    scripture: {
      scriptureReference: "John 3:16",
      scriptureTextEn:
        "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
      scriptureTextZh:
        "神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不致滅亡，反得永生。",
      bibleBook: "John",
      bibleChapter: 3,
      bibleVerseStart: 16,
      bibleTheme: "Salvation",
    },

    customFields: {
      "Biblical Period": "New Testament",
    },
  },
  {
    id: randomUUID(),
    title: "The Good Shepherd",
    description:
      "An exploration of God's guidance and provision as described in Psalm 23.",
    year: "2023",
    medium: "Watercolor on paper",
    imageUrl:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    // Scripture data
    scripture: {
      scriptureReference: "Psalm 23:1-3",
      scriptureTextEn:
        "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
      scriptureTextZh:
        "耶和華是我的牧者，我必不致缺乏。他使我躺臥在青草地上，領我在可安歇的水邊。他使我的靈魂甦醒，為自己的名引導我走義路。",
      bibleBook: "Psalm",
      bibleChapter: 23,
      bibleVerseStart: 1,
      bibleVerseEnd: 3,
      bibleTheme: "Guidance",
    },
    customFields: {
      "Biblical Period": "Old Testament",
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
  return bibleArtworks.filter((artwork) =>
    artwork.scripture.bibleTheme === theme
  );
}

// Helper function to get artworks by book
export function getBibleArtworksByBook(book: string): BibleArtwork[] {
  return bibleArtworks.filter((artwork) =>
    artwork.scripture.bibleBook === book
  );
}
