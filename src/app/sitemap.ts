import type { MetadataRoute } from "next";

import { createCanonicalUrl, publicSitemapRoutes, type SitemapRouteConfig } from "./metadata";
import BibleArtworks from "@/models/bible-artworks";
import Song from "@/models/song";

type SitemapEntry = MetadataRoute.Sitemap[number];
type BibleArtworkSitemapSource = {
  book?: string;
  scripture?: {
    en?: {
      book?: string;
    };
  };
};

const now = new Date();

function toSitemapEntry(route: SitemapRouteConfig): SitemapEntry {
  return {
    url: createCanonicalUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency ?? "monthly",
    priority: route.priority ?? 0.5,
  };
}

function toValidDate(value: string | undefined): Date {
  if (!value) return now;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? now : date;
}

async function getBeyondMusicSongEntries(): Promise<SitemapEntry[]> {
  try {
    const songs = await Song.getAll();
    return songs
      .filter((song) => song.isPublic)
      .map((song) => ({
        url: createCanonicalUrl(`/beyond-music/${encodeURIComponent(song.title)}`),
        lastModified: toValidDate(song.createdAt),
        changeFrequency: "monthly",
        priority: 0.6,
      }));
  } catch (error) {
    console.error("Failed to load songs for sitemap", error);
    return [];
  }
}

function getBibleGalleryBookEntries(): SitemapEntry[] {
  const artworks = BibleArtworks.data as unknown as BibleArtworkSitemapSource[];
  const books = new Set<string>();

  for (const artwork of artworks) {
    const book = artwork.book ?? artwork.scripture?.en?.book;
    if (book) {
      books.add(book);
    }
  }

  return [...books].sort().map((book) => ({
    url: createCanonicalUrl(`/bible-gallery/${encodeURIComponent(book)}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = publicSitemapRoutes.map(toSitemapEntry);
  const [songEntries] = await Promise.all([getBeyondMusicSongEntries()]);
  const bibleGalleryBookEntries = getBibleGalleryBookEntries();

  return [...staticEntries, ...songEntries, ...bibleGalleryBookEntries];
}
