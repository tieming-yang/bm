import BibleGalleryContent from "@/components/bible-gallery";
import BibleArtworks from "@/models/bible-artworks";

type BibleGalleryProps = {
  params: Promise<{ book: string }>;
};

// Main page component with Suspense boundary
export default async function BibleGallery({ params }: BibleGalleryProps) {
  const { book } = await params;
  const artworks = await BibleArtworks.getAll();

  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent params={{ book }} artworks={artworks} />
    </div>
  );
}
