import "server-only";
import { validateGreetingRotations } from "./policy.ts";

/**
 * Frozen daily rotation verified against the Notion gallery on 2026-11-03.
 * The catalog contained 87 image-bearing records and one empty draft. This initial
 * pool contains reviewed, encouraging excerpts; incomplete or malformed quotes are excluded.
 * Excerpts preserve the source text, including its nonbreaking spaces and line breaks.
 * Keep published rotations unchanged; append a new version with a future effective date.
 */
export const greetingRotations = validateGreetingRotations([
  {
    "version": "v1",
    "effectiveFrom": "2026-11-03",
    "entries": [
      {
        "id": "genesis-1-3",
        "artworkPageId": "205035a2-d17b-812a-8b6d-cf4f11d36cbb",
        "artworkTitle": {
          "en": "Genesis 1:1-31",
          "zh-TW": "創世記 1:1-31"
        },
        "verse": {
          "en": "And God said, Let there be light: and there was light.",
          "zh-TW": "神說：要有光，就有了光。"
        },
        "reference": {
          "en": "Genesis 1:3",
          "zh-TW": "創世記 1:3"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 1,
          "verse": 3,
          "section": "1:1-31",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "exodus-3-12",
        "artworkPageId": "211035a2-d17b-80aa-bbb6-efecdf8bed68",
        "artworkTitle": {
          "en": "Exodus 3:1-22",
          "zh-TW": "出埃及記 3:1-22"
        },
        "verse": {
          "en": "Certainly I will be with thee;",
          "zh-TW": "我必與你同在。"
        },
        "reference": {
          "en": "Exodus 3:12",
          "zh-TW": "出埃及記 3:12"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Exodus",
          "chapter": 3,
          "verse": 12,
          "section": "3:1-22",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-9-13",
        "artworkPageId": "2ac035a2-d17b-8003-8394-f043c3a4df49",
        "artworkTitle": {
          "en": "Genesis 9:1-19",
          "zh-TW": "創世記 9:1-19"
        },
        "verse": {
          "en": "I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth.",
          "zh-TW": "我把虹放在雲彩中，這就可作我與地立約的記號了。"
        },
        "reference": {
          "en": "Genesis 9:13",
          "zh-TW": "創世記 9:13"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 9,
          "verse": 13,
          "section": "9:1-19",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "exodus-14-14",
        "artworkPageId": "212035a2-d17b-808a-9ea5-dab4a1d1fcbf",
        "artworkTitle": {
          "en": "Exodus 14:1-31",
          "zh-TW": "出埃及記 14:1-31"
        },
        "verse": {
          "en": "The Lord shall fight for you, and ye shall hold your peace.",
          "zh-TW": "耶和華必為你們爭戰；你們只管靜默，不要作聲。"
        },
        "reference": {
          "en": "Exodus 14:14",
          "zh-TW": "出埃及記 14:14"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Exodus",
          "chapter": 14,
          "verse": 14,
          "section": "14:1-31",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "exodus-15-2",
        "artworkPageId": "212035a2-d17b-8099-a217-cd885de44310",
        "artworkTitle": {
          "en": "Exodus 15:1-27",
          "zh-TW": "出埃及記 15:1-27"
        },
        "verse": {
          "en": "The Lord is my strength and song, and he is become my salvation: he is my God, and I will prepare him an habitation; my father's God, and I will exalt him.",
          "zh-TW": "耶和華是我的力量，我的詩歌，也成了我的拯救。這是我的神，我要讚美他，是我父親的神，我要尊崇他。"
        },
        "reference": {
          "en": "Exodus 15:2",
          "zh-TW": "出埃及記 15:2"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Exodus",
          "chapter": 15,
          "verse": 2,
          "section": "15:1-27",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-15-1",
        "artworkPageId": "2ac035a2-d17b-804f-ac13-e01be9a27364",
        "artworkTitle": {
          "en": "Genesis 15:1-5",
          "zh-TW": "創世記 15:1-5"
        },
        "verse": {
          "en": "Do not be afraid, Abram.\nI am your shield,\nyour very great reward.",
          "zh-TW": "亞伯蘭，你不要懼怕！我是你的盾牌，必大大的賞賜你。"
        },
        "reference": {
          "en": "Genesis 15:1",
          "zh-TW": "創世記 15:1"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 15,
          "verse": 1,
          "section": "15:1-5",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-18-14",
        "artworkPageId": "2e0035a2-d17b-8012-8af3-ef94bf25d97a",
        "artworkTitle": {
          "en": "Genesis 18:1-33",
          "zh-TW": "創世記 18:1-33"
        },
        "verse": {
          "en": "Is anything too hard for the Lord?",
          "zh-TW": "耶和華豈有難成的事嗎？"
        },
        "reference": {
          "en": "Genesis 18:14",
          "zh-TW": "創世記 18:14"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 18,
          "verse": 14,
          "section": "18:1-33",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-21-6",
        "artworkPageId": "2ac035a2-d17b-8018-b506-c07ae9735513",
        "artworkTitle": {
          "en": "Genesis 21:1-7",
          "zh-TW": "創世記 21:1-7"
        },
        "verse": {
          "en": "God has brought me laughter, and everyone who hears about this will laugh with me.",
          "zh-TW": "神使我喜笑，凡聽見的必與我一同喜笑；"
        },
        "reference": {
          "en": "Genesis 21:6",
          "zh-TW": "創世記 21:6"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 21,
          "verse": 6,
          "section": "21:1-7",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-26-24",
        "artworkPageId": "2df035a2-d17b-80aa-ae5e-fcee9e277639",
        "artworkTitle": {
          "en": "Genesis 26:18-31",
          "zh-TW": "創世記 26:18-31"
        },
        "verse": {
          "en": "Do not be afraid, for I am with you;",
          "zh-TW": "你不要怕，因為我與你同在；"
        },
        "reference": {
          "en": "Genesis 26:24",
          "zh-TW": "創世記 26:24"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 26,
          "verse": 24,
          "section": "26:18-31",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-8-22",
        "artworkPageId": "2e0035a2-d17b-808b-8f2d-f39d6dc73268",
        "artworkTitle": {
          "en": "Genesis 8:1-22",
          "zh-TW": "創世記 8:1-22"
        },
        "verse": {
          "en": "As long as the earth endures,\nseedtime and harvest,\ncold and heat,\nsummer and winter,\nday and night\nwill never cease.",
          "zh-TW": "大地尚存之日，\n播種、收割，\n寒暑、\n冬夏、\n白晝和黑夜\n必然循環不息。"
        },
        "reference": {
          "en": "Genesis 8:22",
          "zh-TW": "創世記 8:22"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 8,
          "verse": 22,
          "section": "8:1-22",
          "verifiedOn": "2026-11-03"
        }
      },
      {
        "id": "genesis-12-2",
        "artworkPageId": "2ac035a2-d17b-80ab-a84c-c1f3327fa84c",
        "artworkTitle": {
          "en": "Genesis 12:1-8",
          "zh-TW": "創世記 12:1-8"
        },
        "verse": {
          "en": "I will make you into a great nation,\nand I will bless you;\nI will make your name great,\nand you will be a blessing.",
          "zh-TW": "我必叫你成為大國。我必賜福給你，叫你的名為大；你也要叫別人得福。"
        },
        "reference": {
          "en": "Genesis 12:2",
          "zh-TW": "創世記 12:2"
        },
        "provenance": {
          "source": "notion-bible-artworks",
          "book": "Genesis",
          "chapter": 12,
          "verse": 2,
          "section": "12:1-8",
          "verifiedOn": "2026-11-03"
        }
      }
    ]
  }
]);
