"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Share,
  Loader2, // Import the loading icon
} from "lucide-react";
import { Button } from "./ui/button";
import type { Artwork } from "../types/artwork";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { toast } from "./ui/use-toast";
import { Toaster } from "./ui/toaster";
import useTranslation from "../hooks/useTranslation";

interface ImageGalleryProps {
  artworks: Artwork[];
  infiniteScroll?: boolean;
  initialLimit?: number;
}

export function ImageGallery({
  artworks,
  infiniteScroll = false,
  initialLimit = 8,
}: ImageGalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation("gallery");

  const [selectedImage, setSelectedImage] = useState<Artwork | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showDetails, setShowDetails] = useState(false);
  const [showDonationSheet, setShowDonationSheet] = useState(false);
  const [displayCount, setDisplayCount] = useState(initialLimit);
  const [imageLoading, setImageLoading] = useState<boolean[]>([]);
  const [lightboxImageLoading, setLightboxImageLoading] = useState(true);

  const observerRef = useRef<HTMLDivElement>(null);

  // Create a ref to help track URL updates without triggering re-renders
  const isUrlUpdatingRef = useRef(false);
  const lastImageIdRef = useRef<string | null>(null);

  // Use useMemo for visibleArtworks to prevent unnecessary recalculations
  const visibleArtworks = useMemo(() => {
    return artworks.slice(0, displayCount);
  }, [artworks, displayCount]);

  // Initialize loading state for images
  useEffect(() => {
    setImageLoading(new Array(artworks.length).fill(true));
  }, [artworks]);

  // Load more artworks
  const loadMore = useCallback(() => {
    if (displayCount < artworks.length) {
      setDisplayCount((prev) => Math.min(prev + 8, artworks.length));
    }
  }, [displayCount, artworks.length]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!infiniteScroll || !observerRef.current) return;

    const observerElement = observerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerElement);

    return () => {
      if (observerElement) {
        observer.unobserve(observerElement);
        observer.disconnect();
      }
    };
  }, [infiniteScroll, loadMore]);

  // Update URL when selected image changes, but break the dependency loop
  useEffect(() => {
    if (!selectedImage || !router || !pathname || !searchParams) return;

    // If we're already in the middle of a URL update, don't trigger another one
    if (isUrlUpdatingRef.current) return;

    // Don't update if the image ID hasn't changed
    if (lastImageIdRef.current === selectedImage.id) return;

    // Store the current image ID to avoid duplicate updates
    lastImageIdRef.current = selectedImage.id;

    // Flag that we're updating the URL
    isUrlUpdatingRef.current = true;

    try {
      // Create a new URLSearchParams object
      const params = new URLSearchParams(searchParams.toString() || "");
      const currentImageId = params.get("image");

      // Only update if the image ID has changed
      if (currentImageId !== selectedImage.id) {
        params.set("image", selectedImage.id);

        // Update the URL without refreshing the page, with a delay to avoid render loops
        setTimeout(() => {
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });

          // Reset the flag after the URL has been updated
          setTimeout(() => {
            isUrlUpdatingRef.current = false;
          }, 50);
        }, 50);
      } else {
        isUrlUpdatingRef.current = false;
      }
    } catch (error) {
      console.error("Error updating URL:", error);
      isUrlUpdatingRef.current = false;
    }
  }, [selectedImage?.id, pathname, router, searchParams]);

  // Also modify the URL parameter check to avoid triggering updates while we're updating the URL
  useEffect(() => {
    if (!searchParams || isUrlUpdatingRef.current) return;

    const imageId = searchParams.get("image");
    if (!imageId) return;

    // Don't update if the selected image already matches the URL
    if (selectedImage?.id === imageId || lastImageIdRef.current === imageId) return;

    // Update the ref to reflect that we're processing this image ID
    lastImageIdRef.current = imageId;

    const index = artworks.findIndex((artwork) => artwork.id === imageId);
    if (index !== -1) {
      // Set a flag to indicate that we're responding to a URL change
      isUrlUpdatingRef.current = true;

      // Batch state updates to prevent multiple renders
      const artwork = artworks[index];

      // Simplify the check to avoid TypeScript issues
      let shouldShowDetails = false;
      if ("showDetailsByDefault" in artwork) {
        shouldShowDetails = Boolean(artwork.showDetailsByDefault);
      }

      // Use setTimeout to batch these updates and prevent render cycles
      setTimeout(() => {
        setSelectedImage(artwork);
        setSelectedIndex(index);
        setLightboxImageLoading(true);
        setShowDetails(shouldShowDetails);

        // Reset the flag after a delay
        setTimeout(() => {
          isUrlUpdatingRef.current = false;
        }, 50);
      }, 0);
    }
  }, [artworks, searchParams, selectedImage?.id]);

  // First, memoize the translation function keys to prevent infinite renders
  const memoizedTranslationKeys = useMemo(
    () => ({
      scriptureKey: t("bibleGallery.properties.scripture"),
      referenceKey: t("bibleGallery.properties.reference"),
      biblicalPeriodKey: t("bibleGallery.properties.biblicalPeriod"),
      yearKey: t("artwork.year"),
      mediumKey: t("artwork.medium"),
      dimensionsKey: t("artwork.dimensions"),
      locationKey: t("artwork.location"),
    }),
    [t]
  );

  // Now update the dependent memos to use the stable keys
  const getFilteredCustomFields = useCallback(
    (customFields: Record<string, string> | undefined) => {
      if (!customFields) return [];

      return Object.entries(customFields).filter(
        ([key]) =>
          !key.includes(memoizedTranslationKeys.yearKey) &&
          !key.includes(memoizedTranslationKeys.mediumKey) &&
          !key.includes(memoizedTranslationKeys.dimensionsKey) &&
          !key.includes(memoizedTranslationKeys.locationKey) &&
          !key.includes(memoizedTranslationKeys.scriptureKey) &&
          !key.includes("Scripture") &&
          !key.includes(memoizedTranslationKeys.referenceKey) &&
          !key.includes("Reference") &&
          !key.includes("聖經時期") &&
          !key.includes("Biblical Period") &&
          !key.includes("經文") &&
          !key.includes("Scripture Reference") &&
          !key.includes("參考")
      );
    },
    [memoizedTranslationKeys]
  );

  // First, let's update our memoized helpers to be type-safe and use stable translation keys
  const isBibleArtwork = useMemo(() => {
    if (!selectedImage?.customFields) return false;

    const scripture = selectedImage.customFields["Scripture"];
    const translatedScripture =
      selectedImage.customFields[memoizedTranslationKeys.scriptureKey] || "";

    return scripture !== undefined || translatedScripture !== "";
  }, [selectedImage, memoizedTranslationKeys.scriptureKey]);

  const getScriptureText = useMemo(() => {
    if (!selectedImage?.customFields) return "";

    return (
      selectedImage.customFields["Scripture"] ||
      selectedImage.customFields[memoizedTranslationKeys.scriptureKey] ||
      ""
    );
  }, [selectedImage, memoizedTranslationKeys.scriptureKey]);

  const getReferenceText = useMemo(() => {
    if (!selectedImage?.customFields) return "";

    return (
      selectedImage.customFields["Reference"] ||
      selectedImage.customFields[memoizedTranslationKeys.referenceKey] ||
      ""
    );
  }, [selectedImage, memoizedTranslationKeys.referenceKey]);

  const biblicalPeriod = useMemo(() => {
    if (!selectedImage?.customFields) return null;

    return (
      selectedImage.customFields["Biblical Period"] ||
      selectedImage.customFields["聖經時期"] ||
      selectedImage.customFields[memoizedTranslationKeys.biblicalPeriodKey]
    );
  }, [selectedImage?.customFields, memoizedTranslationKeys.biblicalPeriodKey]);

  // Handle body scroll lock when lightbox is open
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedImage]);

  // Optimize the handleImageLoad function with useCallback
  const handleImageLoad = useCallback((index: number) => {
    setImageLoading((prev) => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });
  }, []);

  // Optimize the image click handler with useCallback
  const handleImageClick = useCallback((artwork: Artwork, index: number) => {
    setSelectedImage(artwork);
    setSelectedIndex(index);
    setShowDetails(false);
  }, []);

  // Update the handleClose to work with our URL tracking approach
  const handleClose = useCallback(() => {
    // Clear the selected image state
    setSelectedImage(null);
    setSelectedIndex(-1);

    // Set the flag to indicate we're updating the URL
    isUrlUpdatingRef.current = true;

    // Also clear the last image ID reference
    lastImageIdRef.current = null;

    // Clear the image parameter from URL
    if (searchParams?.has("image")) {
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("image");

        // If there are other params, keep them, otherwise just use the pathname
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        if (newUrl) {
          // Use setTimeout to avoid state updates during render
          setTimeout(() => {
            router.replace(newUrl, { scroll: false });

            // Reset the flag after the URL has been updated
            setTimeout(() => {
              isUrlUpdatingRef.current = false;
            }, 50);
          }, 0);
        } else {
          isUrlUpdatingRef.current = false;
        }
      } catch (error) {
        console.error("Error clearing URL:", error);
        isUrlUpdatingRef.current = false;
      }
    } else {
      isUrlUpdatingRef.current = false;
    }
  }, [router, pathname, searchParams]);

  const toggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  // Also, let's modify the navigation handlers to fix type issues
  const handlePrevious = useCallback(() => {
    if (selectedIndex > 0) {
      const prevIndex = selectedIndex - 1;
      const prevArtwork = artworks[prevIndex];

      // Simplify the check to avoid TypeScript issues
      let shouldShowDetails = false;
      if ("showDetailsByDefault" in prevArtwork) {
        shouldShowDetails = Boolean(prevArtwork.showDetailsByDefault);
      }

      // Batch updates to reduce re-renders
      setTimeout(() => {
        setSelectedImage(prevArtwork);
        setSelectedIndex(prevIndex);
        setLightboxImageLoading(true);
        setShowDetails(shouldShowDetails);
      }, 0);
    }
  }, [selectedIndex, artworks]);

  const handleNext = useCallback(() => {
    if (selectedIndex < artworks.length - 1) {
      const nextIndex = selectedIndex + 1;
      const nextArtwork = artworks[nextIndex];

      // Simplify the check to avoid TypeScript issues
      let shouldShowDetails = false;
      if ("showDetailsByDefault" in nextArtwork) {
        shouldShowDetails = Boolean(nextArtwork.showDetailsByDefault);
      }

      // Batch updates to reduce re-renders
      setTimeout(() => {
        setSelectedImage(nextArtwork);
        setSelectedIndex(nextIndex);
        setLightboxImageLoading(true);
        setShowDetails(shouldShowDetails);
      }, 0);
    }
  }, [selectedIndex, artworks]);

  // Memoize the handleDownload and handleShare functions
  const handleDownload = useCallback(() => {
    // In a real app, you would implement actual download functionality
    // For this demo, we'll just show the donation sheet
    setShowDonationSheet(true);
  }, []);

  const handleShare = useCallback(() => {
    if (selectedImage) {
      // Create the full URL to share
      const url = `${window.location.origin}${pathname}?image=${selectedImage.id}`;

      // Copy to clipboard
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({
            title: "連結已複製到剪貼簿",
            description: "您現在可以與他人分享這件藝術品",
          });
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          toast({
            title: "複製連結失敗",
            description: "請再試一次",
            variant: "destructive",
          });
        });
    }
  }, [selectedImage, pathname]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage) {
        if (e.key === "ArrowLeft") {
          handlePrevious();
        } else if (e.key === "ArrowRight") {
          handleNext();
        } else if (e.key === "Escape") {
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage, selectedIndex, handlePrevious, handleNext, handleClose]);

  // Add a handler for lightbox image loading completion
  const handleLightboxImageLoad = useCallback(() => {
    setLightboxImageLoading(false);
  }, []);

  return (
    <>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {visibleArtworks.map((artwork, index) => (
          <motion.div
            key={artwork.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group cursor-pointer"
            onClick={() => handleImageClick(artwork, index)}
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              {imageLoading[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}
              <Image
                src={artwork.imageUrl || "/placeholder.svg"}
                alt={artwork.title}
                fill
                className={`object-cover transition-transform duration-500 group-hover:scale-110 ${
                  imageLoading[index] ? "opacity-0" : "opacity-100"
                }`}
                onLoadingComplete={() => handleImageLoad(index)}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={index < 4} // Only prioritize the first 4 images
                quality={80} // Reduce image quality slightly to improve loading
              />
            </div>
            <div className="mt-3">
              <h3 className="font-medium text-lg">{artwork.title}</h3>
              <p className="text-sm text-muted-foreground">{artwork.year}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Load More Button (only for non-infinite scroll) */}
      {!infiniteScroll && displayCount < artworks.length && (
        <div className="mt-12 text-center">
          <Button onClick={loadMore} className="rounded-3xl px-8">
            加載更多
          </Button>
        </div>
      )}

      {/* Infinite Scroll Observer */}
      {infiniteScroll && displayCount < artworks.length && (
        <div ref={observerRef} className="w-full h-20 flex items-center justify-center mt-8">
          <p className="text-muted-foreground">加載中...</p>
        </div>
      )}

      {/* Lightbox - Redesigned to fix overlapping issues */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop - clicking this will close the lightbox */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-lg"
            onClick={handleClose}
          />

          {/* Lightbox Content */}
          <div className="relative z-[101] max-w-5xl w-full bg-background/90 backdrop-blur-lg rounded-3xl overflow-hidden border border-primary/10 m-4 max-h-[90vh] flex flex-col">
            {/* Header with title and buttons - repositioned buttons to fix overlaps */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-border/30">
              <h2 className="text-2xl font-bold">{selectedImage.title}</h2>
              <div className="flex gap-4 items-center">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background/70 transition-colors"
                  title="Share"
                >
                  <Share className="h-5 w-5" />
                  <span className="sr-only">Share</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background/70 transition-colors"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                  <span className="sr-only">Download</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>

            {/* Main content area with image and details */}
            <div className="overflow-y-auto flex-grow p-4">
              <div className="flex flex-col lg:flex-row gap-6 relative">
                {/* Image Container - Added padding to avoid navigation buttons overlapping */}
                <div className="relative h-[50vh] w-full lg:w-3/5 rounded-xl overflow-hidden">
                  {/* Previous Button - Made more visible with improved positioning */}
                  {selectedIndex > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        handlePrevious();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/80 transition-colors shadow-md"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span className="sr-only">Previous image</span>
                    </button>
                  )}

                  {/* Loading indicator for lightbox image */}
                  {lightboxImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-[1]">
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </div>
                  )}

                  <Image
                    src={selectedImage.imageUrl || "/placeholder.svg"}
                    alt={selectedImage.title}
                    fill
                    className="object-cover"
                    priority={true}
                    sizes="(max-width: 1024px) 90vw, 60vw"
                    quality={85}
                    onLoadingComplete={handleLightboxImageLoad}
                  />

                  {/* Next Button - Made more visible with improved positioning */}
                  {selectedIndex < artworks.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        handleNext();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/80 transition-colors shadow-md"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                      <span className="sr-only">Next image</span>
                    </button>
                  )}
                </div>

                {/* Content Section */}
                <div className="w-full lg:w-2/5 flex flex-col gap-4">
                  <div>
                    <p className="text-muted-foreground">{selectedImage.year}</p>

                    {/* Scripture section */}
                    {isBibleArtwork && (
                      <div className="mt-4 mb-2 bg-muted/50 p-4 rounded-md">
                        <h3 className="font-medium mb-2">
                          {t("bibleGallery.properties.scripture") || "Scripture"}
                        </h3>
                        <p className="text-sm text-muted-foreground">{getScriptureText}</p>

                        <div className="mt-2 text-xs text-muted-foreground/70">
                          <span className="font-medium">{getReferenceText}</span>
                        </div>
                      </div>
                    )}

                    {/* Artwork description */}
                    <p className="mt-4 text-muted-foreground">{selectedImage.description}</p>
                  </div>

                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{t("artwork.details") || "Artwork Details"}</h3>
                      <button
                        type="button"
                        onClick={toggleDetails}
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-background/70 transition-colors"
                      >
                        {showDetails ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showDetails
                            ? t("artwork.hideDetails") || "Hide Details"
                            : t("artwork.showDetails") || "Show Details"}
                        </span>
                      </button>
                    </div>

                    {showDetails && (
                      <div className="space-y-2 border-t border-border pt-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("artwork.medium") || "Medium"}
                          </span>
                          <span className="text-sm">{selectedImage.medium}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("artwork.dimensions") || "Dimensions"}
                          </span>
                          <span className="text-sm">{selectedImage.dimensions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("artwork.year") || "Year"}
                          </span>
                          <span className="text-sm">{selectedImage.year}</span>
                        </div>
                        {selectedImage.location && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              {t("artwork.location") || "Location"}
                            </span>
                            <span className="text-sm">{selectedImage.location}</span>
                          </div>
                        )}
                        {selectedImage.customFields &&
                          getFilteredCustomFields(selectedImage.customFields).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{key}</span>
                                <span className="text-sm max-w-[200px] text-right">{value}</span>
                              </div>
                            )
                          )}
                      </div>
                    )}
                  </div>

                  {/* Biblical period info - if available (only shown for Bible artworks) */}
                  {biblicalPeriod && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground/70">
                          {t("bibleGallery.properties.biblicalPeriod") || "Biblical Period"}:
                        </span>
                        <span className="text-xs text-muted-foreground/70">{biblicalPeriod}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donation Sheet */}
      <Sheet open={showDonationSheet} onOpenChange={setShowDonationSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="text-center">
            <SheetTitle className="text-2xl">支持藝術家</SheetTitle>
            <SheetDescription>您的捐款幫助我們繼續創作創新的藝術和媒體體驗</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center gap-8 mt-8">
            <div className="relative w-48 h-48 bg-white p-4 rounded-xl">
              <Image
                src="https://images.unsplash.com/photo-1599458448510-59aecaea4752?q=80&w=1000"
                alt="QR Code for donation"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
            <div className="text-center max-w-md">
              <h3 className="text-lg font-medium mb-2">掃描以捐款</h3>
              <p className="text-muted-foreground">
                您的支持使易揚能夠繼續突破藝術和媒體的界限。每一份貢獻，不論大小，都對我們的創作旅程產生影響。
              </p>
            </div>
            <Button className="mt-4 rounded-3xl px-8" onClick={() => setShowDonationSheet(false)}>
              也許以後再說
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </>
  );
}
