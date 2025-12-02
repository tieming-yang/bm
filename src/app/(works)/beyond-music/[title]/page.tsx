"use client";

import { topGlowBorder } from "@/components/ui/button";
import Song, { type Song as SongType } from "@/models/song";
import { QueryKey } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { use, useEffect, useState } from "react";
import AudioPlayer from "../components/audio-player";
import { sendEmailVerification } from "firebase/auth";

export default function PlayerPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = use(params);
  const decodedTitle = decodeURIComponent(title);
  const [selectedSong, setSelectedSong] = useState<SongType | null>(null);
  const {
    data: songs,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!songs) return;

    const song = songs.find((item) => item.title === decodedTitle) ?? null;
    setSelectedSong(song);
  }, [songs]);

  return (
    <div className="container px-4 py-16 mx-auto space-y-16 min-h-svh">
      {selectedSong && (
        <div className="relative w-full">
          <h1 className="text-3xl text-center">{selectedSong.title}</h1>

          <AudioPlayer song={selectedSong} />
        </div>
      )}
    </div>
  );
}
