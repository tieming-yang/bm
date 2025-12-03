"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/hooks/use-translation";
import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "@/utils/query-keys";
import Song from "@/models/song";
import Link from "next/link";
import { toast } from "sonner";
import Loading from "@/app/loading";

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

  return (
    <div className="container px-4 mx-auto space-y-16 min-h-svh">
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl">
        {t("beyondMusic.hero.title")}
      </h1>
      {songs && (
        <ul className="flex flex-col gap-y-5">
          {songs.map((song) => {
            const { id, title, fileUrl } = song;

            return (
              <li
                key={id}
                className="bg-primary-gradient-50 relative overflow-hidden border shadow-lg rounded-full py-3 shadow-primary/10"
              >
                <Link href={`/beyond-music/${encodeURIComponent(title)}`}>
                  <p className="text-xl text-center">{title}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
