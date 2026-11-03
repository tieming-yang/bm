"use client";

import Song from "@/models/song";
import { QueryKey } from "@/utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import AudioPlayer from "../components/audio-player";
import Loading from "@/app/loading";
import { ContentState } from "@/components/ui/content-state";
import useTranslation from "@/hooks/use-translation";

type ClientPlayerPageProps = {
  title: string;
};

export default function ClientPlayerPage({ title }: ClientPlayerPageProps) {
  const decodedTitle = decodeURIComponent(title);
  const { t } = useTranslation("beyond-music");
  const { t: tUI } = useTranslation("ui");
  const { data: songs, isLoading, error, refetch } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  const selectedSong = songs?.find((item) => item.title === decodedTitle) ?? null;

  return (
    <div className="w-full pb-10 space-y-16 min-h-svh">
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ContentState kind="error" title={tUI("loading.error.title")} description={tUI("loading.error.message")} onRetry={() => { void refetch(); }} />
      ) : !selectedSong ? (
        <ContentState kind="empty" title={t("beyondMusic.notFound")} />
      ) : (
        <div className="relative w-full">
          <header className="relative z-40 w-full px-5 py-3 mx-auto bg-black/10 backdrop-blur-sm">
            <h1 className="font-display text-2xl text-center">{selectedSong.title}</h1>
          </header>

          <AudioPlayer key={selectedSong.id} song={selectedSong} />
        </div>
      )}
    </div> 
  );
}
