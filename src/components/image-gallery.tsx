// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, Download, Share, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { UseEmblaCarouselType } from "embla-carousel-react";
import { Button } from "./ui/button";
import type { BibleArtworksLocale, BibleArtworksCanonical } from "../types/bible-artwork";
import useTranslation from "../hooks/use-translation";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { DonationSheet } from "./donation-sheet";

import { AspectRatio } from "./ui/aspect-ratio";

import Config from "@/models/config";
import { toast } from "sonner";
import Loading from "../app/loading";
import useProfile from "@/hooks/use-profile";

interface ImageGalleryProps {
  bibleArtworks: BibleArtworksLocale[];
  groupedBibleArtworks: BibleArtworksCanonical;
  infiniteScroll?: boolean;
  initialLimit?: number;
  book?: string; // Optional book parameter for filtering
  isGloryShareMember: boolean;
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
    <AspectRatio
      ratio={Config.aspectRatio}
      className="relative overflow-hidden shadow-xl cursor-pointer group"
      onClick={() => {
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
      {isBlur && (
        <div className="pointer-events-none absolute inset-0 bg-black/20 backdrop-blur-md z-50" />
      )}

      <Image
        src={artwork.imageUrl}
        alt={artwork.title || "Bible Artwork"}
        fill
        className={`object-cover transition-transform duration-500 ${
          !isBlur && "group-hover:scale-110"
        } `}
        // sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        loading="lazy"
        priority={false}
        placeholder="blur"
        blurDataURL="/placeholders/blur-noise-placeholder.webp"
        quality={30}
      />
    </AspectRatio>
  );
}

const MAXIMUM_FREE_ARTS = 2;

export function ImageGallery({
  bibleArtworks,
  groupedBibleArtworks,
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

  // Refs
  const observerRef = useRef<HTMLDivElement>(null);
  const urlUpdatingRef = useRef(false);

  // Hooks
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, currentLanguage } = useTranslation("gallery");
  const { t: booksT } = useTranslation("books");
  const { t: tGloryShare } = useTranslation("glory-share");
  const { profile, isProfileLoading } = useProfile();

  // Derived values
  const isBookFiltered = !!book;
  const filteredBibleArtworks = isBookFiltered
    ? groupedBibleArtworks.filter(([bookName, _]) => bookName.toLowerCase() === book?.toLowerCase())
    : groupedBibleArtworks;

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
      const artwork = bibleArtworks.find((a) => a.id === imageId);
      if (artwork) {
        setSelectedArtworkId(artwork.id);
      }
    }
  }, [searchParams, bibleArtworks, selectedArtworkId]);

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

  // Body scroll lock when lightbox is open
  useEffect(() => {
    if (!selectedArtworkId) return;

    document.body.style.overflow = selectedArtworkId ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedArtworkId]);

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

  const handleShare = () => {
    if (!selectedArtwork) return;

    const url = `${window.location.origin}${pathname}?image=${selectedArtwork.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {})
      .catch((err) => {
        console.error(err);
        toast.error(t("toast.linkCopied.error"), {
          description: t("toast.linkCopied.description"),
        });
      });

    toast.success(t("toast.linkCopied.title"), {
      description: t("toast.linkCopied.description"),
    });
  };

  return (
    <>
      {/* Gallery Grid */}
      <ul className="flex flex-col w-full gap-y-10">
        {filteredBibleArtworks.map(([book, artworks]) => (
          <li key={artworks[0].id} className="flex flex-col gap-y-3">
            {/* <a href={`#${book}`} className="anchor"> */}
            <h2
              id={book}
              className="font-mono text-sm font-semibold md:text-2xl text-primary md:scroll-mt-20"
            >
              {booksT(book)}
            </h2>
            {/* </a> */}

            {/* Artworks */}
            <ul className="w-full font-mono grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
              {artworks.map((artwork, index) => (
                <li key={artwork.id} className="cursor-pointer group">
                  <Thumbnail
                    isBlur={(!profile?.joinedGloryShare && index > MAXIMUM_FREE_ARTS) ?? true}
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
        <div className="fixed inset-0 flex items-start justify-center z-100 md:mt-12 md:items-start">
          {/* Backdrop with close handler */}
          <div className="absolute inset-0 h-dvh bg-black/50" onClick={handleClose} />

          {/* Lightbox Content */}
          <div
            className="relative z-101 mx-1 lg:mx-5 h-[calc(100dvh-80px)] md:h-fit max-w-9xl w-full bg-background/70 backdrop-blur-xl rounded-sm overflow-hidden border border-primary/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full overflow-y-auto grow">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col w-full">
                  <div className="grid w-full gap-6 md:gap-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
                    {/* Image Carousel */}
                    <section className="w-full place-self-center sticky top-0">
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
                          {currentBook?.map((artwork: ibleArtworksLocale, index) => (
                            <CarouselItem key={artwork.id}>
                              <AspectRatio
                                ratio={Config.aspectRatio}
                                className="relative overflow-hidden"
                              >
                                {!profile?.joinedGloryShare && index > MAXIMUM_FREE_ARTS && (
                                  <div className="pointer-events-none absolute inset-0 bg-black/20 backdrop-blur-md z-50" />
                                )}
                                <Image
                                  src={artwork.imageUrl}
                                  alt={artwork.id}
                                  fill
                                  loading="lazy"
                                  className="object-contain"
                                  sizes="(max-width: 1024px) 90vw, 60vw"
                                  placeholder="blur"
                                  blurDataURL="/placeholders/blur-noise-placeholder.webp"
                                  onLoad={() => {
                                    if (
                                      artwork.id === selectedArtworkId &&
                                      !lightboxCarouselInitialized
                                    ) {
                                      setLightboxCarouselInitialized(true);
                                    }
                                  }}
                                />
                              </AspectRatio>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                      </Carousel>
                    </section>
                    <div className="flex flex-col px-2 gap-4 md:px-0">
                      {/* Title and Reference */}
                      <section className="flex items-start justify-between md:pt-3 md:px-3 gap-4">
                        <h3 className="font-serif font-medium underline underline-offset-2">
                          {t("bibleGallery.properties.scripture") || "Scripture"}
                        </h3>
                        <span className="text-xs md:text-lg text-muted-foreground">
                          <span className="font-medium">{`${booksT(selectedArtwork.book)} ${
                            selectedArtwork.section
                          }`}</span>
                        </span>
                      </section>
                      <p className="text-sm md:text-lg whitespace-pre-wrap leading-8 text-foreground overflow-auto border rounded-md px-3 py-4 bg-accent-foreground/10 md:max-h-[70vh]">
                        {selectedArtwork.scripture}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
              </div>
            </div>

            {/* Tool Bar */}
            <section className="flex items-center justify-end px-6 border-b border-border">
              <div className="flex items-center gap-4">
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
                <Button
                  variant={"ghost"}
                  onClick={handleClose}
                  className="flex items-center justify-center"
                >
                  <X className="size-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </section>

            <section className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  emblaApi?.scrollPrev();
                }}
                disabled={!emblaApi?.canScrollPrev()}
                className="flex items-center justify-center w-full border-r rounded-none py-7"
              >
                <ChevronLeft className="size-10" />
                <span className="sr-only">Previous</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  emblaApi?.scrollNext();
                }}
                disabled={!emblaApi?.canScrollNext()}
                className="flex items-center justify-center w-full border-l rounded-none py-7"
              >
                <ChevronRight className="size-10" />
                <span className="sr-only">Next</span>
              </Button>
            </section>
          </div>
        </div>
      )}

      {/* Donation Sheet */}
      <DonationSheet open={showDonationSheet} onOpenChange={setShowDonationSheet} />
    </>
  );
}
