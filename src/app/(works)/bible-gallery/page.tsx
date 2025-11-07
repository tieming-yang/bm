"use client";

import BibleGalleryContent from "@/components/bible-gallery";

// Main page component with Suspense boundary
export default function BibleGallery() {
  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent />
    </div>
  );
}
