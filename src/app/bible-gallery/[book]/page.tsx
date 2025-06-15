import { Suspense } from "react";

import BibleGalleryContent from "@/components/bible-gallery";
import Loading from "@/components/loading";

// Main page component with Suspense boundary
export default async function BibleGallery({ params }: { params: { book?: string } }) {
  const { book } = await params;

  return (
    <div className="container px-4 py-12 mx-auto">
      {/* <Suspense fallback={<Loading />}> */}
      <BibleGalleryContent params={{ book }} />
      {/* </Suspense> */}
    </div>
  );
}
