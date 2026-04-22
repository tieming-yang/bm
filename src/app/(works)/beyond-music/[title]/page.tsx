import ClientPlayerPage from "./client-page";
import Song from "@/models/song";
import { createDynamicMetadata } from "@/app/metadata";
import type { Metadata } from "next";

async function fetchSongByTitle(decodedTitle: string) {
  try {
    const songs = await Song.getAll();
    return songs.find((song) => song.title === decodedTitle) ?? null;
  } catch (error) {
    console.error("Failed to fetch songs for metadata", error);
    return null;
  }
}

function buildDescription(title: string, song: Awaited<ReturnType<typeof fetchSongByTitle>>) {
  const lyricPreview =
    song?.lyrics
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^\d+$/.test(line) && !line.includes("-->"))
      .slice(0, 2)
      .join(" ")
      .slice(0, 200) ?? "";

  if (lyricPreview) {
    return `${song?.genre ? `${song.genre} · ` : ""}${title} — ${lyricPreview}`;
  }

  return `${song?.genre ? `${song.genre} · ` : ""}Listen to ${title} on Beyond Music.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ title: string }>;
}): Promise<Metadata> {
  const { title } = await params;
  const decodedTitle = decodeURIComponent(title);
  const song = await fetchSongByTitle(decodedTitle);
  const description = buildDescription(decodedTitle, song);
  const pageTitle = song ? `${song.title} | Beyond Music` : `${decodedTitle} | Beyond Music`;

  return createDynamicMetadata({
    path: `/beyond-music/${encodeURIComponent(decodedTitle)}`,
    title: pageTitle,
    description,
    keywords: [decodedTitle, "Beyond Music", song?.genre ?? ""].filter(Boolean) as string[],
    openGraphType: "music.song",
    openGraph: {
      audio: song?.fileUrl ? [{ url: song.fileUrl }] : undefined,
    },
  });
}

export default async function PlayerPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;

  return <ClientPlayerPage title={title} />;
}
