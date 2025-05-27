"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, ChevronDown, ChevronUp, Download, Share, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import type { BibleArtworksLocale, BibleArtworksGrouped } from "../types/artwork";
import useTranslation from "../hooks/useTranslation";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { DonationSheet } from "./donation-sheet";

import { AspectRatio } from "./ui/aspect-ratio";

import Config from "@/models/config";

interface ImageGalleryProps {
  bibleArtworks: BibleArtworksLocale[];
  groupedBibleArtworks: BibleArtworksGrouped;
  infiniteScroll?: boolean;
  initialLimit?: number;
}

export function ImageGallery({
  bibleArtworks,
  groupedBibleArtworks,
  infiniteScroll = false,
  initialLimit = 8,
}: ImageGalleryProps) {
  // Core state
  const [displayCount, setDisplayCount] = useState(initialLimit);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [showDonationSheet, setShowDonationSheet] = useState(false);
  const [lightboxCarouselInitialized, setLightboxCarouselInitialized] = useState(false);

  // Refs
  const observerRef = useRef<HTMLDivElement>(null);
  const urlUpdatingRef = useRef(false);

  // Hooks
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, currentLanguage } = useTranslation("gallery");
  const { t: booksT } = useTranslation("books");

  // Derived values
  const selectedArtwork = selectedArtworkId
    ? bibleArtworks.find((a) => a.id === selectedArtworkId) || null
    : null;

  const selectedIndex = selectedArtworkId
    ? bibleArtworks.findIndex((a) => a.id === selectedArtworkId)
    : -1;
  const currentBookName = Object.entries(groupedBibleArtworks).find(([bookName, group]) =>
    group.some((artwork) => artwork.id === selectedArtworkId)
  )?.[0];
  const currentBook = groupedBibleArtworks[currentBookName || ""] || [];
  const currentIndexInBook = currentBook.findIndex((a) => a.id === selectedArtworkId);

  // Initialize selectedArtworkId from URL if present
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

  // Update URL when selectedArtworkId changes (avoid circular updates)
  useEffect(() => {
    if (!selectedArtworkId || !router || !pathname || urlUpdatingRef.current) return;

    const params = new URLSearchParams(searchParams?.toString() || "");
    const currentImageId = params.get("image");

    if (currentImageId !== selectedArtworkId) {
      urlUpdatingRef.current = true;
      params.set("image", selectedArtworkId);

      // Use setTimeout to batch updates and avoid multiple URL changes
      setTimeout(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });

        // Reset flag after URL update
        setTimeout(() => {
          urlUpdatingRef.current = false;
        }, 100);
      }, 0);
    }
  }, [selectedArtworkId, router, pathname, searchParams]);

  // Infinite scroll effect
  useEffect(() => {
    if (!infiniteScroll || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < bibleArtworks.length) {
          setDisplayCount((prev) => Math.min(prev + 8, bibleArtworks.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [infiniteScroll, displayCount, bibleArtworks.length]);

  // Body scroll lock when lightbox is open
  useEffect(() => {
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
  // TODO: Fix share functionality
  const handleShare = () => {
    if (!selectedArtwork) return;

    const url = `${window.location.origin}${pathname}?image=${selectedArtwork.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {})
      .catch(() => {});
  };

  return (
    <>
      {/* Gallery Grid */}

      <ul className="flex flex-col w-full gap-y-10">
        {Object.entries(groupedBibleArtworks).map(([book, collections]) => (
          <li key={collections[0].id} className="flex flex-col gap-y-3">
            <a href={`#${book}`} className="anchor">
              <h2
                id={book}
                className="text-3xl text-primary md:scroll-mt-20 font-serif font-semibold"
              >
                {booksT(book)}
              </h2>
            </a>

            {/* Paitings */}
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 w-full gap-7">
              {collections.map((painting, index) => (
                <motion.li
                  key={painting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group cursor-pointer"
                  onClick={() => handleImageClick(painting.id)}
                >
                  <AspectRatio
                    ratio={Config.aspectRatio}
                    className="relative overflow-hidden shadow-xl"
                  >
                    <Image
                      src={painting.imageUrl}
                      alt={painting.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority
                      placeholder="blur"
                    />
                  </AspectRatio>

                  <h3>{painting.title}</h3>
                </motion.li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* Load More Button */}
      {!infiniteScroll && displayCount < bibleArtworks.length && (
        <div className="mt-12 text-center">
          <Button
            onClick={() => setDisplayCount((prev) => Math.min(prev + 8, bibleArtworks.length))}
            className="rounded-3xl px-8"
          >
            {t("loadMore")}
          </Button>
        </div>
      )}

      {/* Infinite Scroll Observer */}
      {infiniteScroll && displayCount < bibleArtworks.length && (
        <div ref={observerRef} className="w-full h-20 flex items-center justify-center mt-8">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      )}

      {/* Lightbox using Carousel */}
      {selectedArtwork && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop with close handler */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-lg"
            onClick={handleClose}
          />

          {/* Lightbox Content */}
          <div
            className="relative z-[101] max-w-9xl w-full bg-background/90 backdrop-blur-lg rounded-sm overflow-hidden border border-primary/10 m-4 max-h-[99vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Content */}
            <section className="overflow-y-auto flex-grow w-full">
              <div className="flex flex-col 2xl:flex-row gap-6">
                {/* Image Carousel */}
                <div className="w-full">
                  <Carousel
                    opts={{
                      loop: true,
                      startIndex: selectedIndex,
                    }}
                    className="w-full"
                    onSelect={() => {
                      if (!lightboxCarouselInitialized) {
                        setLightboxCarouselInitialized(true);
                      }
                    }}
                  >
                    <CarouselContent>
                      {currentBook.map((artwork) => (
                        <CarouselItem key={artwork.id}>
                          <AspectRatio
                            ratio={Config.aspectRatio}
                            className="relative overflow-hidden"
                          >
                            <Image
                              src={artwork.imageUrl}
                              alt={artwork.title}
                              fill
                              className="object-contain"
                              sizes="(max-width: 1024px) 90vw, 60vw"
                              priority
                              placeholder="blur"
                              onLoadingComplete={() => {
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
                    <CarouselPrevious
                      className="lg:left-4 left-0"
                      onMouseDown={() => {
                        setSelectedArtworkId((prevId) => {
                          if (!prevId) return prevId;

                          const prevIndex =
                            (currentIndexInBook - 1 + currentBook.length) % currentBook.length;
                          const prevArtwork = currentBook[prevIndex];

                          return prevArtwork.id;
                        });
                      }}
                    />
                    <CarouselNext
                      className="lg:right-4 right-0"
                      onMouseDown={() => {
                        setSelectedArtworkId((prevId) => {
                          if (!prevId) return prevId;

                          const nextIndex = (currentIndexInBook + 1) % currentBook.length;
                          const nextArtwork = currentBook[nextIndex];

                          return nextArtwork.id;
                        });
                      }}
                    />
                    <CarouselDots />
                  </Carousel>
                </div>

                {/* Details */}
                <section className="w-full flex flex-col gap-4 px-3 md:px-5">
                  <p className="text-muted-foreground">{selectedArtwork.year}</p>

                  {/* Scripture section (for Bible bibleArtworks) */}

                  <div className="bg-muted/50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">
                      {t("bibleGallery.properties.scripture") || "Scripture"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedArtwork.scripture.text}
                    </p>

                    <div className="mt-2 text-xs text-muted-foreground/70">
                      <span className="font-medium">{selectedArtwork.scripture.reference()}</span>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{t("artwork.details") || "Artwork Details"}</h3>
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-background/70 transition-colors"
                      >
                        {showDetails ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showDetails ? "Hide Details" : "Show Details"}
                        </span>
                      </button>
                    </div>

                    {showDetails && (
                      <div className="space-y-2 border-t border-border pt-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("artwork.medium") || "Medium"}
                          </span>
                          <span className="text-sm">{selectedArtwork.medium}</span>
                        </div>
                        <div className="flex justify-between">
                          {selectedArtwork.dimensions && (
                            <span className="text-sm text-muted-foreground">
                              {t("artwork.dimensions") || "Dimensions"}
                              <span className="text-sm">{selectedArtwork.dimensions}</span>
                            </span>
                          )}
                        </div>
                        {selectedArtwork.location && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              {t("artwork.location") || "Location"}
                            </span>
                            <span className="text-sm">{selectedArtwork.location}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </section>

            {/* Tool Bar */}
            <section className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-border/30">
              <h2 className="text-2xl font-bold">{selectedArtwork.title}</h2>
              <div className="flex gap-4 items-center">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background/70 transition-colors"
                >
                  <Share className="h-5 w-5" />
                  <span className="sr-only">Share</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background/70 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  <span className="sr-only">Download</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 hover:bg-background/70 transition-colors"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Donation Sheet */}
      <DonationSheet open={showDonationSheet} onOpenChange={setShowDonationSheet} />
    </>
  );
}
