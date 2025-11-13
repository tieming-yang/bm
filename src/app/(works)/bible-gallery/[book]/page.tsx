import BibleGalleryContent from "@/components/bible-gallery";

type BibleGalleryProps = {
  params: Promise<{ book: string }>;
};

// Main page component with Suspense boundary
export default async function BibleGallery({ params }: BibleGalleryProps) {
  const { book } = await params;

  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent params={{ book }} />
    </div>
  );
}
