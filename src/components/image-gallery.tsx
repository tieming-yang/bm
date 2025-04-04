"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "./ui/button";
import type { Artwork } from "../types/artwork";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { toast } from "./ui/use-toast";
import { Toaster } from "./ui/toaster";

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

  const [selectedImage, setSelectedImage] = useState<Artwork | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showDetails, setShowDetails] = useState(false);
  const [showDonationSheet, setShowDonationSheet] = useState(false);
  const [visibleArtworks, setVisibleArtworks] = useState<Artwork[]>([]);
  const [displayCount, setDisplayCount] = useState(initialLimit);

  const observerRef = useRef<HTMLDivElement>(null);

  // Initialize visible artworks
  useEffect(() => {
    setVisibleArtworks(artworks.slice(0, displayCount));
  }, [artworks, displayCount]);

  // Load more artworks
  const loadMore = useCallback(() => {
    if (displayCount < artworks.length) {
      setDisplayCount((prev) => Math.min(prev + 8, artworks.length));
    }
  }, [displayCount, artworks.length]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!infiniteScroll || !observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [infiniteScroll, loadMore]);

  // Check URL for image ID on mount
  useEffect(() => {
    if (!searchParams) {
      console.error("No search params available");
      return;
    }
    const imageId = searchParams.get("image");
    if (imageId) {
      const index = artworks.findIndex((artwork) => artwork.id === imageId);
      if (index !== -1) {
        setSelectedImage(artworks[index]);
        setSelectedIndex(index);
      }
    }
  }, [artworks, searchParams]);

  // Update URL when selected image changes
  useEffect(() => {
    if (selectedImage) {
      // Create a new URLSearchParams object
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("image", selectedImage.id);

      // Update the URL without refreshing the page
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      // If no image is selected, remove the image parameter
      if (searchParams?.has("image")) {
        const params = new URLSearchParams(searchParams?.toString());
        params.delete("image");

        // If there are other params, keep them, otherwise just use the pathname
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        if (!newUrl) {
          console.error("Error: No URL to replace");
          return;
        }
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [selectedImage, pathname, router, searchParams]);

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

  const handleImageClick = (artwork: Artwork, index: number) => {
    setSelectedImage(artwork);
    setSelectedIndex(index);
    setShowDetails(false);
  };

  const handleClose = () => {
    setSelectedImage(null);
    setSelectedIndex(-1);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      setSelectedImage(artworks[selectedIndex - 1]);
      setSelectedIndex(selectedIndex - 1);
      setShowDetails(false);
    }
  };

  const handleNext = () => {
    if (selectedIndex < artworks.length - 1) {
      setSelectedImage(artworks[selectedIndex + 1]);
      setSelectedIndex(selectedIndex + 1);
      setShowDetails(false);
    }
  };

  const handleDownload = () => {
    // In a real app, you would implement actual download functionality
    // For this demo, we'll just show the donation sheet
    setShowDonationSheet(true);
  };

  const handleShare = () => {
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
  };

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
  }, [selectedImage, selectedIndex]);

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
              <Image
                src={artwork.imageUrl || "/placeholder.svg"}
                alt={artwork.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
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

      {/* Lightbox - Completely rewritten with simpler structure */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop - clicking this will close the lightbox */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-lg"
            onClick={handleClose}
          />

          {/* Lightbox Content */}
          <div className="relative z-[101] max-w-5xl w-full bg-background/90 backdrop-blur-lg rounded-3xl overflow-hidden border border-primary/10 m-4">
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-[102]">
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">關閉</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 h-full">
              {/* Image Container */}
              <div className="relative aspect-square md:aspect-auto md:h-full">
                <Image
                  src={selectedImage.imageUrl || "/placeholder.svg"}
                  alt={selectedImage.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Content Section */}
              <div className="p-6 pt-16 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedImage.title}</h2>
                    <p className="text-muted-foreground">{selectedImage.year}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background/70 transition-colors"
                    >
                      <Share className="h-5 w-5" />
                      <span className="sr-only">分享</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background/70 transition-colors"
                    >
                      <Download className="h-5 w-5" />
                      <span className="sr-only">下載</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-muted-foreground">{selectedImage.description}</p>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">藝術品詳細資訊</h3>
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
                        {showDetails ? "隱藏詳細資訊" : "顯示詳細資訊"}
                      </span>
                    </button>
                  </div>

                  {showDetails && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">媒材</span>
                        <span className="text-sm">{selectedImage.medium}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">尺寸</span>
                        <span className="text-sm">{selectedImage.dimensions}</span>
                      </div>
                      {selectedImage.location && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">位置</span>
                          <span className="text-sm">{selectedImage.location}</span>
                        </div>
                      )}
                      {selectedImage.customFields &&
                        Object.entries(selectedImage.customFields).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{key}</span>
                            <span className="text-sm">{value}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-8 z-[102] pointer-events-none">
            {selectedIndex > 0 && (
              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                  <span className="sr-only">Previous image</span>
                </button>
              </div>
            )}

            {selectedIndex < artworks.length - 1 && (
              <div className="pointer-events-auto ml-auto">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                  <span className="sr-only">Next image</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Donation Sheet */}
      <Sheet open={showDonationSheet} onOpenChange={setShowDonationSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="text-center">
            <SheetTitle className="text-2xl">支持藝術家</SheetTitle>
            <SheetDescription>
              您的捐款幫助我們繼續創作創新的藝術和媒體體驗
            </SheetDescription>
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
