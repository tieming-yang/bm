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
    <div className="container px-4 py-10 mx-auto space-y-16 min-h-svh">
      {selectedSong && (
        <div className="relative w-full">
          <header className="fixed mx-auto bg-primary-gradient-10 px-5 rounded-full border inset-x-0 backdrop-blur-3xl py-2 w-fit z-100">
            <h1 className="text-2xl text-center">{selectedSong.title}</h1>
          </header>

          <AudioPlayer song={selectedSong} />
        </div>
      )}
    </div>
  );
}
