"use client";

import Link from "next/link";

import { AspectRatio } from "./ui/aspect-ratio";
import Image from "next/image";
import useTranslation from "@/hooks/use-translation";
import { motion } from "framer-motion";
import Config from "@/models/config";
import BibleArtworks from "@/models/bible-artworks";
import { useQuery } from "@tanstack/react-query";
import Loading from "../app/loading";
import { ContentState } from "@/components/ui/content-state";
import { useState } from "react";
import { QueryKey } from "@/utils/query-keys";
import type { BibleArtworksLocale } from "@/types/bible-artwork";

type Props = {};

export default function BibleBooks({}: Props) {
  const { t, currentLanguage } = useTranslation("books");
  const { t: tUI } = useTranslation("ui");

  const {
    data: artworks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QueryKey.artworks],
    queryFn: () => BibleArtworks.getAll(),
    staleTime: Infinity,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (error || !artworks) {
    return <ContentState title={tUI("loading.error.title")} description={tUI("loading.error.message")} onRetry={() => { void refetch(); }} />;
  }

  if (artworks.length === 0) return <ContentState kind="empty" title={tUI("content.emptyTitle")} description={tUI("content.emptyDescription")} />;

  const localedArtworks = BibleArtworks.toLocaleScripture(artworks, currentLanguage);
  const groupedArtworks = BibleArtworks.toGrouped(localedArtworks);
  const sortedCanonicalBooks = BibleArtworks.toSoredGroupsCanonical(
    groupedArtworks,
    BibleArtworks.order
  );
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="min-h-48"
    >
      <ul className="z-20 px-3 pb-20 grid grid-cols-1 md:grid-cols-2 w-svw md:px-5 xl:px-7 place-content-center gap-10">
        {sortedCanonicalBooks.map(([book, artworks]) => (
          <li key={artworks[0].id} className="flex flex-col gap-y-3">
            <BookCover book={book} artwork={artworks[0]} />
            <h2 className="font-sans text-sm font-semibold md:text-md text-primary">{t(book)}</h2>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function BookCover({ book, artwork }: { book: string; artwork: Pick<BibleArtworksLocale, "id" | "imageUrl"> }) {
  const { t } = useTranslation("ui");
  const { t: tBook } = useTranslation("books");
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  return (
    <AspectRatio ratio={Config.aspectRatio} className="relative overflow-hidden shadow-xl">
      <Link href={`/bible-gallery/${book}`} aria-label={tBook(book)} className="absolute inset-0">
        <Image key={attempt} src={artwork.imageUrl} alt={tBook(book)} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 768px) 100vw, 50vw" unoptimized loading="lazy" onLoad={() => setStatus("loaded")} onError={() => setStatus("error")} quality={30} />
      </Link>
      {status === "loading" && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><Loading isInlined /></div>}
      {status === "error" && <div className="absolute inset-0 flex items-center justify-center bg-background"><ContentState title={t("loading.error.title")} onRetry={() => { setStatus("loading"); setAttempt((previous) => previous + 1); }} /></div>}
    </AspectRatio>
  );
}
