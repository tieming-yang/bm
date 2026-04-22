import { createPageMetadata, pageMetadata } from "@/app/metadata";
import BibleGalleryContent from "@/components/bible-gallery";

export const metadata = createPageMetadata(pageMetadata.bibleGallery);

// Main page component with Suspense boundary
export default async function BibleGallery() {
  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent />
    </div>
  );
}
