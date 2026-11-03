"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X,
  Download,
  Share,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PlayIcon,
  ImageIcon,
  ImagePlayIcon,
  SpeechIcon,
} from "lucide-react";
import { UseEmblaCarouselType } from "embla-carousel-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { ContentState } from "./ui/content-state";
import type {
  BibleArtworksLocale,
  BibleArtworksCanonical,
  BibleArtwork,
} from "../types/bible-artwork";
import useTranslation from "../hooks/use-translation";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { DonationSheet } from "./donation-sheet";

import { AspectRatio } from "./ui/aspect-ratio";

import Config from "@/models/config";
import { toast } from "sonner";
import Loading from "../app/loading";
import useProfile from "@/hooks/use-profile";
import BibleArtworks from "@/models/bible-artworks";
import { YoutubePlayer } from "./youtube-player";
import { PlayerStatue } from "@/app/(works)/beyond-music/components/audio-player";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { TFunction } from "i18next";

interface ImageGalleryProps {
  artworks: BibleArtwork[];
  infiniteScroll?: boolean;
  initialLimit?: number;
  book?: string; // Optional book parameter for filtering
  isGloryShareMember: boolean;
}

const MAXIMUM_FREE_ARTS = 2;

export function ImageGallery({
  artworks,
  infiniteScroll = false,
  initialLimit = 8,
  book,
  isGloryShareMember,
}: ImageGalleryProps) {
  // Core state
  const [displayCount, setDisplayCount] = useState(initialLimit);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [showDonationSheet, setShowDonationSheet] = useState(false);
  const [lightboxCarouselInitialized, setLightboxCarouselInitialized] = useState(false);

  const [emblaApi, setEmblaApi] = useState<UseEmblaCarouselType[1] | null>(null);

  const [displayMode, setDisplayMode] = useState<"image" | "video">("image");
  const [playerStatus, setPlayerStatus] = useState<PlayerStatue>("loading");
  // Refs
  const observerRef = useRef<HTMLDivElement>(null);
  const urlUpdatingRef = useRef(false);
  const voPlayerRef = useRef<HTMLAudioElement>(null);

  // Hooks
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, currentLanguage } = useTranslation("gallery");
  const { t: booksT } = useTranslation("books");
  const { t: tGloryShare } = useTranslation("glory-share");
  const { profile, isProfileLoading } = useProfile();
  const [imageStates, setImageStates] = useState<Record<string, "loaded" | "error">>({});
  const [imageAttempts, setImageAttempts] = useState<Record<string, number>>({});

  const localeArtworks = BibleArtworks.toLocaleScripture(artworks, currentLanguage);
  const groupedBibleArtworks = BibleArtworks.toGrouped(localeArtworks);
  const sortedCanonicalBooks = BibleArtworks.toSoredGroupsCanonical(
    groupedBibleArtworks,
    BibleArtworks.order
  );

  // Derived values
  const isBookFiltered = !!book;
  const filteredBibleArtworks = isBookFiltered
    ? sortedCanonicalBooks.filter(([bookName, _]) => bookName.toLowerCase() === book?.toLowerCase())
    : sortedCanonicalBooks;

  // Find the tuple [bookName, groupArray] containing the selected artwork
  const currentBookTuple = selectedArtworkId
    ? filteredBibleArtworks.find(([bookName, group]) =>
        group.some((artwork) => artwork.id === selectedArtworkId)
      )
    : undefined;
  const [currentBookName, currentBook] = currentBookTuple ? currentBookTuple : [];
  const selectedIndexInBook = selectedArtworkId
    ? currentBook?.findIndex((art) => art.id === selectedArtworkId)
    : -1;

  // Derive selectedArtwork from the current book group:
  const selectedArtwork =
    selectedIndexInBook !== undefined && selectedIndexInBook >= 0
      ? currentBook?.[selectedIndexInBook]
      : null;

  //! Sync selectedArtworkId with Embla Carousel
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap();
      const artwork = currentBook?.[idx];
      if (artwork) {
        setSelectedArtworkId(artwork.id);
      }
    };
    emblaApi.on("select", onSelect);
    // initialize selection
    // onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, currentBook]);

  //! Initialize selectedArtworkId from URL if present
  useEffect(() => {
    if (urlUpdatingRef.current) return;

    const imageId = searchParams?.get("image");
    if (imageId && !selectedArtworkId) {
      const artwork = localeArtworks.find((a) => a.id === imageId);
      if (artwork) {
        setSelectedArtworkId(artwork.id);
      }
    }
  }, [searchParams, localeArtworks, selectedArtworkId]);

  //! Update URL when selectedArtworkId changes (avoid circular updates)
  // useEffect(() => {
  //   if (!selectedArtworkId || !router || !pathname || urlUpdatingRef.current) return;

  //   const params = new URLSearchParams(searchParams?.toString() || "");
  //   const currentImageId = params.get("image");

  //   if (currentImageId !== selectedArtworkId) {
  //     urlUpdatingRef.current = true;
  //     params.set("image", selectedArtworkId);

  //     // Use setTimeout to batch updates and avoid multiple URL changes
  //     setTimeout(() => {
  //       // router.replace(`${pathname}?${params.toString()}`, { scroll: false });

  //       // Reset flag after URL update
  //       setTimeout(() => {
  //         urlUpdatingRef.current = false;
  //       }, 100);
  //     }, 0);
  //   }
  // }, [selectedArtworkId, router, pathname, searchParams]);

  // Infinite scroll effect
  // useEffect(() => {
  //   if (!infiniteScroll || !observerRef.current) return;

  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       if (entries[0].isIntersecting && displayCount < bibleArtworks.length) {
  //         setDisplayCount((prev) => Math.min(prev + 8, bibleArtworks.length));
  //       }
  //     },
  //     { threshold: 0.1 }
  //   );

  //   observer.observe(observerRef.current);
  //   return () => observer.disconnect();
  // }, [infiniteScroll, displayCount, bibleArtworks.length]);

  // Event handlers
  const handleClose = () => {
    if (urlUpdatingRef.current) return;

    // Set flag to prevent race conditions
    urlUpdatingRef.current = true;

    // Clear selected artwork state
    setSelectedArtworkId(null);
    setLightboxCarouselInitialized(false);

    // Update URL
    if (searchParams?.has("image")) {
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("image");
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

        // Use timeout to ensure state is updated before URL changes
        setTimeout(() => {
          if (!newUrl) {
            console.error("No URL to update");
            return;
          }
          router.replace(newUrl, { scroll: false });

          // Reset flag after URL update
          setTimeout(() => {
            urlUpdatingRef.current = false;
          }, 100);
        }, 0);
      } catch (error) {
        console.error("Error updating URL:", error);
        urlUpdatingRef.current = false;
      }
    } else {
      urlUpdatingRef.current = false;
    }
  };

  const handleImageClick = (artworkId: string) => {
    if (urlUpdatingRef.current) return;
    setSelectedArtworkId(artworkId);
  };

  const handleDownload = () => {
    if (!selectedArtwork) return;

    // Show the donation sheet first
    setShowDonationSheet(true);

    const image = new window.Image();
    image.src =
      typeof selectedArtwork.imageUrl === "string"
        ? selectedArtwork.imageUrl
        : selectedArtwork.imageUrl.src;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${selectedArtwork.title}.png`;
      link.click();
    };
  };

  const handleShare = async () => {
    if (!selectedArtwork) return;

    const url = `${window.location.origin}${pathname}?image=${selectedArtwork.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("toast.linkCopied.title"), {
        description: t("toast.linkCopied.description"),
      });
    } catch (err) {
      console.error(err);
      toast.error(t("toast.copyFailed.title"), {
        description: t("toast.copyFailed.description"),
      });
    }
  };

  const isFreeMember = !profile || profile?.memberType === "free";
  const showContentBlock = (index: number) => isFreeMember && index > MAXIMUM_FREE_ARTS;

  return (
    <>
      {/* Gallery Grid */}
      {filteredBibleArtworks.length === 0 && <ContentState kind="empty" title={t("bibleGallery.empty")} />}
      <ul className="flex flex-col w-full gap-y-10">
        {filteredBibleArtworks.map(([book, artworks]) => (
          <li key={artworks[0].id} className="flex flex-col gap-y-3">
            {/* <a href={`#${book}`} className="anchor"> */}
            <h2
              id={book}
              className="font-display text-xl font-semibold md:text-2xl text-primary md:scroll-mt-20"
            >
              {booksT(book)}
            </h2>
            {/* </a> */}

            {/* Artworks */}
            <ul className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
              {artworks.map((artwork, index) => (
                <li key={artwork.id} className="cursor-pointer group">
                  <Thumbnail
                    isBlur={showContentBlock(index)}
                    artwork={artwork}
                    onClick={handleImageClick}
                    router={router}
                    tGloryShare={tGloryShare}
                  />
                  <h3 className="text-sm md:text-md">{artwork.section}</h3>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* Load More Button */}
      {/* {!infiniteScroll && displayCount < bibleArtworks.length && (
        <div className="mt-12 text-center">
          <Button
            onClick={() => setDisplayCount((prev) => Math.min(prev + 8, bibleArtworks.length))}
            className="px-8 rounded-3xl"
          >
            {t("loadMore")}
          </Button>
        </div>
      )} */}

      {/* Infinite Scroll Observer */}
      {/* {infiniteScroll && displayCount < bibleArtworks.length && (
        <div ref={observerRef} className="flex items-center justify-center w-full h-20 mt-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )} */}

      {/* Lightbox using Carousel */}
      {selectedArtwork && (
        <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
          <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-7xl flex-col gap-0 overflow-hidden rounded-3xl border-primary/10 bg-background/95 p-0 backdrop-blur-xl"
          >
            <DialogTitle className="sr-only">{selectedArtwork.title ?? `${booksT(selectedArtwork.book)} ${selectedArtwork.section}`}</DialogTitle>
            <div className="w-full overflow-y-auto grow">
              <div className="flex flex-col h-full gap-6 justify-center-safe">
                <div className="flex flex-col w-full">
                  <div className="grid w-full gap-6 md:gap-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
                    {/* Image Carousel */}
                    <section className="sticky top-0 w-full overflow-x-hidden place-self-center">
                      <Carousel
                        opts={{
                          loop: true,
                          startIndex: selectedIndexInBook,
                        }}
                        className="w-full"
                        onSelect={() => {
                          if (!lightboxCarouselInitialized) {
                            setLightboxCarouselInitialized(true);
                          }
                        }}
                        setApi={setEmblaApi}
                      >
                        <CarouselContent>
                          {currentBook?.map((artwork: BibleArtworksLocale, index) => (
                            <CarouselItem key={artwork.id}>
                              <AspectRatio
                                ratio={Config.aspectRatio}
                                className="relative overflow-hidden"
                              >
                                {showContentBlock(index) && (
                                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 p-5 text-center backdrop-blur-md">
                                    <p className="text-lg font-semibold">{t("controls.lockedTitle")}</p>
                                    <p className="max-w-sm text-sm text-muted-foreground">{t("controls.lockedDescription")}</p>
                                    <Button asChild><Link href="/glory-share">{t("controls.membershipAction")}</Link></Button>
                                  </div>
                                )}
                                {!showContentBlock(index) && !imageStates[artwork.id] && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><Loading isInlined /></div>}
                                {!showContentBlock(index) && imageStates[artwork.id] === "error" && (
                                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                                    <ContentState kind="error" title={t("controls.imageError")} onRetry={() => {
                                      setImageStates((states) => {
                                        const { [artwork.id]: failed, ...remaining } = states;
                                        return remaining;
                                      });
                                      setImageAttempts((attempts) => ({ ...attempts, [artwork.id]: (attempts[artwork.id] ?? 0) + 1 }));
                                    }} />
                                  </div>
                                )}
                                <Image
                                  key={`${artwork.id}-${imageAttempts[artwork.id] ?? 0}`}
                                  src={artwork.imageUrl}
                                  alt={artwork.title ?? `${booksT(artwork.book)} ${artwork.section}`}
                                  fill
                                  preload
                                  className="object-contain"
                                  placeholder="blur"
                                  blurDataURL="/placeholders/blur-noise-placeholder.webp"
                                  onLoad={() => {
                                    if (
                                      artwork.id === selectedArtworkId &&
                                      !lightboxCarouselInitialized
                                    ) {
                                      setLightboxCarouselInitialized(true);
                                    }

                                    setImageStates((states) => ({ ...states, [artwork.id]: "loaded" }));
                                  }}
                                  onError={() => setImageStates((states) => ({ ...states, [artwork.id]: "error" }))}
                                />
                              </AspectRatio>
                            </CarouselItem>
                          ))}
                          {displayMode === "video" && (
                            <div className="fixed top-0 w-px min-w-full z-10001">
                              <YoutubePlayer
                                src={selectedArtwork.videoUrl}
                                title={selectedArtwork.title}
                                loop={false}
                              />
                            </div>
                          )}
                        </CarouselContent>
                      </Carousel>
                    </section>
                    <div className="flex flex-col px-2 gap-4 md:px-0">
                      {/* Title and Reference */}
                      <section className="flex items-start justify-between gap-4 md:pt-3 md:px-3">
                        <h3 className="font-medium underline underline-offset-2">
                          {t("bibleGallery.properties.scripture") || "Scripture"}
                        </h3>
                        <span className="text-xs md:text-lg text-muted-foreground">
                          <span className="font-medium">{`${booksT(selectedArtwork.book)} ${
                            selectedArtwork.section
                          }`}</span>
                        </span>
                      </section>
                      <p className="text-xl md:text-2xl whitespace-pre-wrap leading-8 text-foreground overflow-auto border rounded-md px-3 py-4 bg-accent-foreground/5 md:max-h-[70vh]">
                        {selectedArtwork.scripture}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Details */}
              </div>
            </div>

            {/* Tool Bar */}
            <section className="flex items-center justify-center px-6 py-3 border-b md:px-10 border-border">
              <div className="flex flex-wrap justify-between w-full md:justify-end gap-x-7 gap-y-3">
                {/* <Button
                  variant={"ghost"}
                  onClick={handleShare}
                  className="flex items-center justify-center"
                >
                  <Share className="size-5" />
                  <span className="sr-only">Share</span>
                </Button> */}
                {/* <Button
                  variant={"ghost"}
                  onClick={handleDownload}
                  className="flex items-center justify-center"
                >
                  <Download className="size-5" />
                  <span className="sr-only">Download</span>
                </Button> */}
                <div className="flex gap-5 items-center-safe">
                  {selectedArtwork.videoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={displayMode === "image" ? t("controls.showVideo") : t("controls.showImage")}
                      onClick={() => {
                        if (displayMode === "image") {
                          setDisplayMode("video");
                        } else {
                          setDisplayMode("image");
                        }
                      }}
                    >
                      {displayMode === "image" ? <ImagePlayIcon /> : <ImageIcon />}
                    </Button>
                  )}
                  {currentLanguage.startsWith("zh") && selectedArtwork.voUrl && <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={playerStatus === "play" ? t("controls.pauseNarration") : t("controls.playNarration")}
                    disabled={playerStatus === "loading"}
                    onClick={() => {
                      if (playerStatus === "pause") {
                        if (!voPlayerRef.current) return;
                        void voPlayerRef.current.play().catch((error) => {
                          console.error("Narration playback failed", error);
                          toast.error(t("controls.audioError"));
                          setPlayerStatus("pause");
                        });
                      } else if (playerStatus === "play") {
                        if (!voPlayerRef.current) return;
                        voPlayerRef.current.pause();
                        setPlayerStatus("pause");
                      }
                    }}
                  >
                    {!voPlayerRef.current && <Loading isInlined />}
                    <SpeechIcon
                      className={`${playerStatus === "pause" ? "text-gray-400" : "text-white animate-pulse"}  `}
                    />
                  </Button>}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!selectedArtwork.videoUrl && displayMode === "video") {
                        setDisplayMode("image");
                      }
                      emblaApi?.scrollPrev();
                    }}
                    disabled={!emblaApi?.canScrollPrev()}
                  >
                    <ChevronLeft className="size-6" /> <span className="sr-only">{t("controls.previous")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!selectedArtwork.videoUrl && displayMode === "video") {
                        setDisplayMode("image");
                      }
                      emblaApi?.scrollNext();
                    }}
                    disabled={!emblaApi?.canScrollNext()}
                  >
                    <ChevronRight className="size-6" />
                    <span className="sr-only">{t("controls.next")}</span>
                  </Button>
                </div>
                <Button size="icon" type="button" variant="ghost" onClick={handleClose}>
                  <X />
                  <span className="sr-only">{t("controls.close")}</span>
                </Button>
              </div>
            </section>
          </DialogContent>

          {currentLanguage.startsWith("zh") && (
            <div className="hidden pb-24 md:fixed md:left-5 md:bottom-25 z-1000 bg-black/70 backdrop-blur-3xl md:bg-transparent md:backdrop-blur-none md:pb-0">
              <audio
                ref={voPlayerRef}
                className=""
                src={selectedArtwork.voUrl}
                autoPlay={false}
                controls
                style={{
                  margin: ".5rem auto 0",
                  padding: "0",
                }}
                onLoadedMetadata={() => setPlayerStatus("pause")}
                onPlay={() => setPlayerStatus("play")}
                onPause={() => setPlayerStatus("pause")}
                onError={() => setPlayerStatus("pause")}
              ></audio>
            </div>
          )}
        </Dialog>
      )}

      {/* Donation Sheet */}
      <DonationSheet open={showDonationSheet} onOpenChange={setShowDonationSheet} />
    </>
  );
}

function Thumbnail({
  artwork,
  onClick,
  isBlur,
  router,
  tGloryShare,
}: {
  artwork: BibleArtworksLocale;
  onClick: (id: string) => void;
  isBlur: boolean;
  router: AppRouterInstance;
  tGloryShare: TFunction<string, undefined>;
}) {
  return (
    <button
      type="button"
      aria-label={artwork.title ?? artwork.section}
      className="relative block w-full overflow-hidden rounded-2xl text-left shadow-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        if (isBlur) {
          toast.info(tGloryShare("gallary.joinToEnjoyArtwork"), {
            action: {
              label: tGloryShare("gloryShare.toast.joinNow"),
              onClick: () => router.push("/glory-share"),
            },
          });
          return;
        }
        onClick(artwork.id);
      }}
    >
      <AspectRatio ratio={Config.aspectRatio}>
      {isBlur && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-black/20 backdrop-blur-md" />
      )}

      <Image
        src={artwork.imageUrl}
        alt={artwork.title ?? artwork.section}
        fill
        className={`object-cover transition-transform duration-500 ${
          !isBlur && "group-hover:scale-110"
        } `}
        unoptimized
        placeholder="blur"
        blurDataURL="/placeholders/blur-noise-placeholder.webp"
      />
      </AspectRatio>
    </button>
  );
}
