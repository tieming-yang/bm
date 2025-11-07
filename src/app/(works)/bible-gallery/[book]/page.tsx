"use client";

import BibleGalleryContent from "@/components/bible-gallery";

// Main page component with Suspense boundary
export default function BibleGallery({ params }: { params: { book?: string } }) {
  const { book } = params;

  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent params={{ book }} />
    </div>
  );
}
