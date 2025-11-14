"use client";

import { motion } from "framer-motion";
import useTranslation from "@/hooks/use-translation";
import { ImageGallery } from "./image-gallery";
import BibleArtworks from "@/models/bible-artworks";
import { useQuery } from "@tanstack/react-query";
import Loading from "../app/loading";
import { toast } from "sonner";
import useProfile from "@/hooks/use-profile";
import { useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BibleArtwork } from "@/types/bible-artwork";

export default function BibleGalleryContent({ params }: { params?: { book?: string } }) {
  const { t, currentLanguage } = useTranslation("gallery");
  const { t: tUI } = useTranslation("ui");
  const { t: tGloryShare } = useTranslation("glory-share");
  const book = params?.book;

  const { profile, isProfileLoading } = useProfile();
  //TODO: fetch depends on if user is memenber
  const {
    data: artworks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bibleArtworks", currentLanguage],
    queryFn: () => BibleArtworks.getAll(),
    staleTime: Infinity,
  });

  if (error) {
    toast.error(tUI("loading.error.title"), {
      description: tUI("loading.error.message"),
    });
  }

  return (
    <div className="z-50 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center space-y-10"
      >
        <div>
          <h1 className="mb-6 text-4xl font-bold text-transparent md:text-6xl bg-linear-to-r from-primary to-secondary bg-clip-text">
            {t("bibleGallery.title")}
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
            {t("bibleGallery.subtitle")}
          </p>
        </div>

        {!profile?.joinedGloryShare && (
          <Link href={"/glory-share"}>
            <Button variant={"outline"} className="py-10 rounded-full text-secondary font-serif">
              <h2 className="text-xl text-wrap">{tGloryShare("gallary.joinToEnjoyArtwork")}</h2>
            </Button>
          </Link>
        )}
      </motion.div>

      {isLoading ? (
        <Loading />
      ) : (
        artworks && (
          <ImageGallery
            artworks={artworks}
            infiniteScroll={false}
            book={book}
            isGloryShareMember={profile?.joinedGloryShare ?? false}
          />
        )
      )}
    </div>
  );
}
