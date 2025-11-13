import BibleGalleryContent from "@/components/bible-gallery";
import BibleArtworks from "@/models/bible-artworks";

// Main page component with Suspense boundary
export default async function BibleGallery() {
  const artworks = await BibleArtworks.getAll();
  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent artworks={artworks} />
    </div>
  );
}
