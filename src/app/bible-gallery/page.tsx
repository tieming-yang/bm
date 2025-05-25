"use client";

import { Suspense } from "react";

import BibleGalleryContent from "@/components/bible-gallery";
import Loading from "@/components/loading";

// Main page component with Suspense boundary
export default function BibleGallery() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Suspense fallback={<Loading />}>
        <BibleGalleryContent />
      </Suspense>
    </div>
  );
}
