"use client";

import Link from "next/link";

import { AspectRatio } from "./ui/aspect-ratio";
import Image from "next/image";
import useTranslation from "@/hooks/useTranslation";
import { motion } from "framer-motion";
import Config from "@/models/config";
import BibleArtworks from "@/models/bible-artworks";

type Props = {};

export default function BibleBooks({}: Props) {
  const { t, currentLanguage } = useTranslation("books");
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="h-svh"
    >
      <ul className="grid grid-cols-1 md:grid-cols-2 w-full place-content-center gap-7">
        {Object.entries(BibleArtworks.groupedByBook(currentLanguage)).map(([book, collections]) => (
          <li key={collections[0].id} className="flex flex-col gap-y-3">
            <Link href={`/bible-gallery/#${book}`}>
              <AspectRatio
                ratio={Config.aspectRatio}
                className="relative overflow-hidden shadow-xl"
              >
                <Image
                  src={collections[0].imageUrl}
                  alt={collections[0].title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  priority
                  placeholder="blur"
                />
              </AspectRatio>
            </Link>
            <h2 className="text-3xl text-primary font-serif font-semibold">{t(book)}</h2>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
