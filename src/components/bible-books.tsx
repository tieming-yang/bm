"use client";

import Link from "next/link";

import { AspectRatio } from "./ui/aspect-ratio";
import Image from "next/image";
import useTranslation from "@/hooks/useTranslation";
import { motion } from "framer-motion";
import Config from "@/models/config";
import BibleArtworks from "@/models/bible-artworks";
import { useQuery } from "@tanstack/react-query";
import Loading from "./loading";
import { toast } from "sonner";

type Props = {};

export default function BibleBooks({}: Props) {
  const { t, currentLanguage } = useTranslation("books");
  const { t: tUI } = useTranslation("ui");

  const {
    data: artworks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bibleArtworks", currentLanguage],
    queryFn: () => BibleArtworks.getAll(),
  });

  if (isLoading) {
    return <Loading />;
  }

  if (error || !artworks) {
    toast.error(tUI("loading.error.title"), {
      description: tUI("loading.error.message"),
    });
  }

  const localedArtworks = BibleArtworks.toLocaleScripture(artworks!, currentLanguage);
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
      className="h-svh"
    >
      <ul className="z-20 px-3 grid grid-cols-1 md:grid-cols-2 w-svw md:px-5 xl:px-7 place-content-center gap-10">
        {sortedCanonicalBooks.map(([book, artworks]) => (
          <li key={artworks[0].id} className="flex flex-col gap-y-3">
            <Link href={`/bible-gallery/${book}`}>
              <AspectRatio
                ratio={Config.aspectRatio}
                className="relative overflow-hidden shadow-xl"
              >
                <Image
                  src={artworks[0].imageUrl}
                  alt={artworks[0].id}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  priority
                  placeholder="blur"
                  blurDataURL={"placeholders/artwork-placeholder.svg"}
                />
              </AspectRatio>
            </Link>
            <h2 className="font-mono text-sm md:text-md font-semibold text-primary">{t(book)}</h2>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
