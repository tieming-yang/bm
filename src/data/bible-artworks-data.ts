import { BibleArtwork, Scripture } from "@/types/artwork";

/**
 * Factory to build a Scripture object with a dynamic reference() method.
 */
function makeScripture(opts: {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  chapterEnd?: number;
  text: string;
  theme?: string;
}): Scripture {
  const { book, chapter, verseStart, verseEnd, text, theme, chapterEnd } = opts;
  return {
    book,
    chapter,
    verseStart,
    verseEnd,
    chapterEnd,
    text,
    theme,
    reference() {
      if (chapterEnd && verseEnd) {
        if (chapterEnd === chapter) {
          return `${book} ${chapter}:${verseStart}-${verseEnd}`;
        }
        return `${book} ${chapter}:${verseStart}-${chapterEnd}:${verseEnd}`;
      }
      return `${book} ${chapter}:${verseStart}` +
        (verseEnd ? `-${verseEnd}` : "");
    },
  };
}

export const bibleArtworks: BibleArtwork[] = [
  {
    id: crypto.randomUUID(),
    title: "Creation",
    description:
      "An artistic representation of the creation of the world as described in Genesis.",
    year: "2023",
    medium: "Oil on canvas",
    imageUrl:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    customFields: {
      "Biblical Period": "Beginning",
    },
    scripture: {
      en: makeScripture({
        book: "Genesis",
        chapter: 1,
        verseStart: 1,
        verseEnd: 2,
        text:
          "In the beginning God created the heavens and the earth. Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
        theme: "Creation",
      }),
      zh: makeScripture({
        book: "創世記",
        chapter: 1,
        verseStart: 1,
        verseEnd: 2,
        text: "起初，神創造天地。地是空虛混沌，淵面黑暗；神的靈運行在水面上。",
        theme: "創造",
      }),
    },
  },
  {
    id: crypto.randomUUID(),
    title: "Salvation",
    description: "A visual meditation on God's love and the gift of salvation.",
    year: "2023",
    medium: "Digital art",
    imageUrl:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    customFields: {
      "Biblical Period": "New Testament",
    },
    scripture: {
      en: makeScripture({
        book: "John",
        chapter: 3,
        verseStart: 16,
        text:
          "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        theme: "Salvation",
      }),
      zh: makeScripture({
        book: "約翰福音",
        chapter: 3,
        verseStart: 16,
        text:
          "神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不致滅亡，反得永生。",
        theme: "救恩",
      }),
    },
  },
  {
    id: crypto.randomUUID(),
    title: "The Good Shepherd",
    description:
      "An exploration of God's guidance and provision as described in Psalm 23.",
    year: "2023",
    medium: "Watercolor on paper",
    imageUrl:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?q=80&w=1000",
    customFields: {
      "Biblical Period": "Old Testament",
    },
    scripture: {
      en: makeScripture({
        book: "Psalm",
        chapter: 23,
        verseStart: 1,
        verseEnd: 3,
        text:
          "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
        theme: "Guidance",
      }),
      zh: makeScripture({
        book: "詩篇",
        chapter: 23,
        verseStart: 1,
        verseEnd: 3,
        text:
          "耶和華是我的牧者，我必不致缺乏。他使我躺臥在青草地上，領我在可安歇的水邊。他使我的靈魂甦醒，為自己的名引導我走義路。",
        theme: "引導",
      }),
    },
  },
];
