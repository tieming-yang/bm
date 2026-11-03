"use client";

import { motion } from "framer-motion";
import useTranslation from "@/hooks/use-translation";
import { ImageGallery } from "./image-gallery";
import BibleArtworks from "@/models/bible-artworks";
import { useQuery } from "@tanstack/react-query";
import useProfile from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Profile from "@/models/profiles";
import Intro from "./intro";
import { QueryKey } from "@/utils/query-keys";
import Loading from "@/app/loading";
import { ContentState } from "@/components/ui/content-state";

export default function BibleGalleryContent({ params }: { params?: { book?: string } }) {
  const { t } = useTranslation("gallery");
  const { t: tUI } = useTranslation("ui");
  const { t: tGloryShare } = useTranslation("glory-share");
  const book = params?.book;

  const { profile, isProfileLoading } = useProfile();
  //TODO: fetch depends on if user is memenber
  const {
    data: artworks,
    isLoading: isArtworksLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QueryKey.artworks],
    queryFn: () => BibleArtworks.getAll(),
    staleTime: Infinity,
  });

  const isGloryShareMember = Profile.isGloryShareMember(profile);
  const isLoading = isProfileLoading || isArtworksLoading;

  return (
    <>
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center space-y-10"
        >
          <div>
            <h1 className="font-display mb-6 text-4xl font-bold text-transparent md:text-6xl bg-linear-to-r from-primary to-secondary bg-clip-text">
              {t("bibleGallery.title")}
            </h1>
            <Intro i18nKey="bibleGallery.intro" />
          </div>

          {!isGloryShareMember && (
            <Button asChild variant="outline" className="h-auto min-h-11 py-4 px-6 text-secondary">
              <Link href="/glory-share">
                <span className="text-base md:text-lg text-wrap">{tGloryShare("gallary.joinToEnjoyArtwork")}</span>
              </Link>
            </Button>
          )}
        </motion.div>

        {isLoading ? (
          <Loading />
        ) : error ? (
          <ContentState kind="error" title={tUI("loading.error.title")} description={tUI("loading.error.message")} onRetry={() => { void refetch(); }} />
        ) : !artworks?.length ? (
          <ContentState kind="empty" title={t("bibleGallery.empty")} />
        ) : (
          <ImageGallery artworks={artworks} infiniteScroll={false} book={book} isGloryShareMember={isGloryShareMember} />
        )}
      </div>
    </>
  );
}
