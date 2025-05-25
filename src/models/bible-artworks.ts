import type { BibleArtwork } from "@/types/artwork";
import { randomUUID } from "crypto";
import { bibleArtworks } from "@/data/bible-artworks-data";

const BibleArtwork = {
  data: bibleArtworks,

  getById: (id: string): BibleArtwork | undefined => {
    return bibleArtworks.find((artwork) => artwork.id === id);
  },
};

export default BibleArtwork;
