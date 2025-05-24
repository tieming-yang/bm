"use client";

import { Suspense } from "react";

import BibleGalleryContent from "@/components/bible-gallery";

// Main page component with Suspense boundary
export default function BibleGallery() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Suspense fallback={<div className="flex justify-center py-20">Loading...</div>}>
        <BibleGalleryContent />
      </Suspense>
    </div>
  );
}
