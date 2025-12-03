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
    toast.error(t("loading.error.title"), {
      description: t("loading.error.message"),
    });
  }

  return (
    <div className="container px-4 py-32 mx-auto space-y-16 min-h-svh">
      {songs && (
        <ul>
          {songs.map((song) => {
            const { id, title, fileUrl } = song;

            return (
              <li
                key={id}
                className="relative overflow-hidden border shadow-lg rounded-full border-primary/20 bg-linear-to-br from-primary/10 via-background to-secondary/10 py-3 shadow-primary/10"
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
