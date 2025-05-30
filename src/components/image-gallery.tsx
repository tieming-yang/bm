"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Share,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { EmblaCarouselType } from "embla-carousel-react";
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
import { toast } from "sonner";

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

  const [emblaApi, setEmblaApi] = useState<EmblaCarouselType | null>(null);

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

  useEffect(() => {
    if (!selectedArtworkId) {
      const imageId = searchParams?.get("image");
      if (imageId) {
        const artwork = bibleArtworks.find((a) => a.id === imageId);
        if (artwork) {
          setSelectedArtworkId(artwork.id);
        }
      }
    }
  }, []);

  // Sync selectedArtworkId when carousel changes
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap();
      const artwork = currentBook[idx];
      if (artwork) {
        setSelectedArtworkId(artwork.id);
      }
    };
    emblaApi.on("select", onSelect);
    // initialize selection
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, currentBook]);

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
        {Object.entries(groupedBibleArtworks).map(([book, artworks]) => (
          <li key={artworks[0].id} className="flex flex-col gap-y-3">
            <a href={`#${book}`} className="anchor">
              <h2
                id={book}
                className="font-serif text-3xl font-semibold text-primary md:scroll-mt-20"
              >
                {booksT(book)}
              </h2>
            </a>

            {/* Paitings */}
            <ul className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
              {artworks.map((artwork, index) => (
                <motion.li
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="cursor-pointer group"
                  onClick={() => handleImageClick(artwork.id)}
                >
                  <AspectRatio
                    ratio={Config.aspectRatio}
                    className="relative overflow-hidden shadow-xl"
                  >
                    <Image
                      src={artwork.imageUrl}
                      alt={artwork.title || "Bible Artwork"}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority
                      placeholder="blur"
                      blurDataURL="placeholders/artwork-placeholder.svg"
                    />
                  </AspectRatio>

                  <h3>{artwork.title}</h3>
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
            className="px-8 rounded-3xl"
          >
            {t("loadMore")}
          </Button>
        </div>
      )}

      {/* Infinite Scroll Observer */}
      {infiniteScroll && displayCount < bibleArtworks.length && (
        <div ref={observerRef} className="flex items-center justify-center w-full h-20 mt-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Lightbox using Carousel */}
      {selectedArtwork && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop with close handler */}
          <div
            className="absolute inset-0 bg-background/30 backdrop-blur-lg"
            onClick={handleClose}
          />

          {/* Lightbox Content */}
          <div
            className="relative mx-1 md:mx-5 z-[101] max-w-9xl w-full bg-background/70 backdrop-blur-xl rounded-sm overflow-hidden border border-primary/10 max-h-[99vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Content */}
            <section className="flex-grow w-full overflow-y-auto">
              <div className="flex flex-col gap-6">
                <section className="flex flex-col w-full px-1 gap-4 md:px-5">
                  {/* Scripture section (for Bible bibleArtworks) */}

                  <div className="p-4 bg-muted/50 rounded-md">
                    <h3 className="mb-2 font-serif font-medium">
                      {t("bibleGallery.properties.scripture") || "Scripture"}
                    </h3>
                    <p className="text-sm md:text-xl text-foreground text-clip h-32 overflow-auto">
                      {selectedArtwork.scripture.text}
                    </p>

                    <div className="mt-2 text-xs md:text-md text-muted-foreground">
                      <span className="font-medium">{selectedArtwork.scripture.reference()}</span>
                    </div>
                  </div>
                </section>
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
                    setApi={setEmblaApi}
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
                  </Carousel>
                </div>

                {/* Details */}
                <section className="flex flex-col w-full px-3 gap-4 md:px-5">
                  {/* Details Section */}
                  <div className="mt-2 font-serif">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{t("artwork.details") || "Artwork Details"}</h3>
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-background/70 transition-colors"
                      >
                        {showDetails ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="sr-only">
                          {showDetails ? "Hide Details" : "Show Details"}
                        </span>
                      </button>
                    </div>

                    {showDetails && (
                      <div className="pt-2 border-t space-y-2 border-border">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("artwork.year") || "Year"}
                          </span>
                          <span className="text-sm">{selectedArtwork.year}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("artwork.medium") || "Medium"}
                          </span>
                          <span className="text-sm">{`${
                            selectedArtwork.medium || "Digital Artwork"
                          }`}</span>
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
            <section className="flex items-center justify-end px-6 pt-6 pb-2 border-b border-border">
              <div className="flex items-center gap-4">
                <Button
                  variant={"ghost"}
                  onClick={handleShare}
                  className="flex items-center justify-center"
                >
                  <Share className="size-5" />
                  <span className="sr-only">Share</span>
                </Button>
                <Button
                  variant={"ghost"}
                  onClick={handleDownload}
                  className="flex items-center justify-center"
                >
                  <Download className="size-5" />
                  <span className="sr-only">Download</span>
                </Button>
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
                className="flex items-center justify-center w-full border-r-[1px] rounded-none py-7"
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
                className="flex items-center justify-center w-full border-l-[1px] rounded-none py-7"
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
