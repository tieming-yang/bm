"use client";

import Song, { type Song as SongType } from "@/models/song";
import { QueryKey } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import AudioPlayer from "../components/audio-player";

type ClientPlayerPageProps = {
  title: string;
};

export default function ClientPlayerPage({ title }: ClientPlayerPageProps) {
  const decodedTitle = decodeURIComponent(title);
  const [selectedSong, setSelectedSong] = useState<SongType | null>(null);
  const { data: songs } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!songs) return;

    const song = songs.find((item) => item.title === decodedTitle) ?? null;
    setSelectedSong(song);
  }, [songs, decodedTitle]);

  return (
    <div className="container px-0 pb-10 min-w-svw mx-auto space-y-16 min-h-svh">
      {selectedSong && (
        <div className="relative w-full">
          <header className="fixed mx-auto px-5 inset-x-0 bg-black/10 backdrop-blur-sm py-3 w-full z-40">
            <h1 className="text-2xl text-center">{selectedSong.title}</h1>
          </header>

          <AudioPlayer song={selectedSong} />
        </div>
      )}
    </div> 
  );
}
