"use client";

import { Suspense } from "react";

import BibleGalleryContent from "@/components/bible-gallery";
import Loading from "@/components/loading";

// Main page component with Suspense boundary
export default function BibleGallery() {
  return (
    <div className="container px-4 py-12 mx-auto">
      {/* <Suspense fallback={<Loading />}> */}
        <BibleGalleryContent />
      {/* </Suspense> */}
    </div>
  );
}
