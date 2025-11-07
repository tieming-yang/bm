"use client";

import BibleGalleryContent from "@/components/bible-gallery";
import { use } from "react";

type BibleGalleryProps = {
  params: Promise<{ book: string }>;
};

// Main page component with Suspense boundary
export default function BibleGallery({ params }: BibleGalleryProps) {
  const { book } = use(params);

  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent params={{ book }} />
    </div>
  );
}
