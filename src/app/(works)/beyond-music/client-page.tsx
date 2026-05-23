"use client";

import useTranslation from "@/hooks/use-translation";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Song from "@/models/song";
import Link from "next/link";
import { toast } from "sonner";
import Loading from "@/app/loading";
import { sendGAEvent } from "@next/third-parties/google";
import Intro from "@/components/intro";
import ProtectedRoute from "@/components/protected-route";

export default function ClientBeyondMusicPage() {
  const { t } = useTranslation("beyond-music");
  const { t: tUI } = useTranslation("ui");

  const {
    data: songs,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKey.songs],
    queryFn: () => Song.getAll(),
    staleTime: Infinity,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    toast.error(tUI("loading.error.title"), {
      description: tUI("loading.error.message"),
    });
  }

  // Group songs by split genre tags
  const groupedSongs: Record<string, typeof songs> = {};
  if (songs) {
    for (const song of songs) {
      const genres = song.genre
        ? song.genre.split(",").map((g) => g.trim()).filter(Boolean)
        : [];
      const genresToUse = genres.length > 0 ? genres : ["Others"];
      for (const g of genresToUse) {
        if (!groupedSongs[g]) {
          groupedSongs[g] = [];
        }
        groupedSongs[g].push(song);
      }
    }
  }

  // Sort genres alphabetically, keeping "Others" at the end
  const sortedGenres = Object.keys(groupedSongs).sort((a, b) => {
    if (a === "Others") return 1;
    if (b === "Others") return -1;
    return a.localeCompare(b);
  });

  return (
    <ProtectedRoute>
      <div className="container px-4 pt-3 mx-auto min-w-svw bg-primary-gradient-30 pb-50 min-h-svh">
        <h1 className="text-4xl leading-tight tracking-tight text-center text-balance md:text-5xl">
          {t("beyondMusic.hero.title")}
        </h1>
        <Intro i18nKey="beyondMusic.intro" />
        {sortedGenres.length > 0 && (
          <div className="max-w-xl mx-auto space-y-10 mt-10">
            {sortedGenres.map((genre) => (
              <section key={genre} className="space-y-4">
                <h2 className="text-2xl font-semibold border-b border-white/10 pb-1.5 uppercase tracking-wider text-white/90">
                  {genre === "Others" ? t("beyondMusic.genres.others", "Others") : genre}
                </h2>
                <ul className="flex flex-col gap-y-4 pl-4">
                  {(groupedSongs[genre] ?? []).map((song) => {
                    const { id, title } = song;

                    return (
                      <li key={`${genre}-${id}`} className="">
                        <Link
                          href={`/beyond-music/${encodeURIComponent(title)}`}
                          onClick={() => sendGAEvent("event", "listening", { value: title })}
                          className="hover:text-white/80 transition-colors inline-block"
                        >
                          <p className="font-serif text-xl">{title}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
