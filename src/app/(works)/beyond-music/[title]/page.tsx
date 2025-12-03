import Config from "@/models/config";
import ClientPlayerPage from "./client-page";
import Song from "@/models/song";
import { Metadata } from "next";

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
  params: { title: string };
}): Promise<Metadata> {
  const { title } = await params;
  const decodedTitle = decodeURIComponent(title);
  const song = await fetchSongByTitle(decodedTitle);
  const description = buildDescription(decodedTitle, song);
  const canonicalUrl = new URL(`/beyond-music/${encodeURIComponent(decodedTitle)}`, Config.baseUrl)
    .href;
  const pageTitle = song ? `${song.title} | Beyond Music` : `${decodedTitle} | Beyond Music`;

  return {
    title: pageTitle,
    description,
    keywords: [decodedTitle, "Beyond Music", song?.genre ?? ""].filter(Boolean) as string[],
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      type: "music.song",
      siteName: "Beyond Digital Media",
      images: [
        {
          url: Config.OGImage,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
      audio: song?.fileUrl ? [{ url: song.fileUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [Config.OGImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;

  return <ClientPlayerPage title={title} />;
}
