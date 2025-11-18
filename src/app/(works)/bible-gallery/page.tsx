import type { Metadata } from "next";
import BibleGalleryContent from "@/components/bible-gallery";

export const metadata: Metadata = {
  title: "Bible Gallery | Beyond Digital Media 聖經畫廊",
  description:
    "Explore limited Bible-inspired artworks crafted for collectors, churches, and families, celebrating redemption through immersive visuals. 探索為藏家、教會與家庭打造的聖經靈感限量藝術，透過沉浸式視覺呈現救贖故事。",
  keywords: [
    "Bible art",
    "scripture gallery",
    "faith-based exhibition",
    "sacred collectibles",
    "immersive Christian art",
    "聖經藝術",
    "經文畫廊",
    "信仰展覽",
    "聖潔收藏",
    "沉浸式基督教藝術",
  ],
  openGraph: {
    title: "Bible Gallery | Beyond Digital Media 聖經畫廊",
    description:
      "Explore limited Bible-inspired artworks crafted for collectors, churches, and families, celebrating redemption through immersive visuals. 探索為藏家、教會與家庭打造的聖經靈感限量藝術，透過沉浸式視覺呈現救贖故事。",
    url: "https://beyond-media.art/bible-gallery",
    type: "website",
    images: [
      {
        url: "https://beyond-media.art/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Bible Gallery | Beyond Digital Media 聖經畫廊",
      },
    ],
    locale: "en_US",
    alternateLocale: ["zh_TW"],
    siteName: "Beyond Digital Media",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bible Gallery | Beyond Digital Media 聖經畫廊",
    description:
      "Explore limited Bible-inspired artworks crafted for collectors, churches, and families, celebrating redemption through immersive visuals. 探索為藏家、教會與家庭打造的聖經靈感限量藝術，透過沉浸式視覺呈現救贖故事。",
    images: ["https://beyond-media.art/opengraph-image.png"],
  },
  alternates: {
    canonical: "https://beyond-media.art/bible-gallery",
    languages: {
      en: "https://beyond-media.art/bible-gallery",
      "zh-TW": "https://beyond-media.art/zh-TW/bible-gallery",
    },
  },
};

// Main page component with Suspense boundary
export default async function BibleGallery() {
  return (
    <div className="container px-4 py-12 mx-auto">
      <BibleGalleryContent />
    </div>
  );
}
