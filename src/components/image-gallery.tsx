"use client";

import { useState, useEffect, useRef, use } from "react";
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
import { UseEmblaCarouselType } from "embla-carousel-react";
import { Button } from "./ui/button";
import type {
  BibleArtworksLocale,
  BibleArtworksGrouped,
  BibleArtworksCanonical,
} from "../types/bible-artwork";
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
import { on } from "events";

interface ImageGalleryProps {
  bibleArtworks: BibleArtworksLocale[];
  groupedBibleArtworks: BibleArtworksCanonical;
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

  // Derived values

  // Find the tuple [bookName, groupArray] containing the selected artwork
  const currentBookTuple = selectedArtworkId
    ? groupedBibleArtworks.find(([bookName, group]) =>
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
        {groupedBibleArtworks.map(([book, artworks]) => (
          <li key={artworks[0].id} className="flex flex-col gap-y-3">
            <a href={`#${book}`} className="anchor">
              <h2
                id={book}
                className="font-serif text-xl md:text-2xl font-semibold text-primary md:scroll-mt-20"
              >
                {booksT(book)}
              </h2>
            </a>

            {/* Artworks */}
            <ul className="w-full grid grid-cols-1 font-serif md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7">
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
                      blurDataURL="../app/opengraph-image.png"
                    />
                  </AspectRatio>

                  <h3>{artwork.section}</h3>
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
        <div className="fixed inset-0 z-[100] flex items-start pt-1 md:items-center justify-center">
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
                    <p className="text-sm md:text-xl whitespace-pre-wrap leading-10 text-foreground text-clip h-32 overflow-auto">
                      {selectedArtwork.scripture}
                    </p>

                    <div className="mt-2 text-xs md:text-md text-muted-foreground">
                      <span className="font-medium">{`${booksT(selectedArtwork.book)} ${
                        selectedArtwork.section
                      }`}</span>
                    </div>
                  </div>
                </section>
                {/* Image Carousel */}
                <div className="w-full">
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
                      {currentBook?.map((artwork: BibleArtworksLocale) => (
                        <CarouselItem key={artwork.id}>
                          <AspectRatio
                            ratio={Config.aspectRatio}
                            className="relative overflow-hidden"
                          >
                            <Image
                              src={artwork.imageUrl}
                              alt={artwork.id}
                              fill
                              className="object-contain"
                              sizes="(max-width: 1024px) 90vw, 60vw"
                              priority
                              placeholder="blur"
                              blurDataURL="placeholders/artwork-placeholder.svg"
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
              </div>
            </section>

            {/* Tool Bar */}
            <section className="flex items-center justify-end px-6 pb-2 border-b border-border">
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
