import type { Metadata } from "next";
import Config from "@/models/config";
import ClientDonatePage from "./client-page";

const title = "Donate | Beyond Digital Media";
const description =
  "Your donation helps us continue creating innovative art and media experiences.";
const canonicalUrl = new URL("/donate", Config.baseUrl).href;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: canonicalUrl,
    type: "website",
    siteName: "Beyond Digital Media",
    images: [
      {
        url: Config.OGImage,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [Config.OGImage],
  },
  alternates: {
    canonical: canonicalUrl,
  },
};

export default function DonatePage() {
  return <ClientDonatePage />;
}
