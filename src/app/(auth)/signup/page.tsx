import type { Metadata } from "next";
import Config from "@/models/config";
import SignUpClientPage from "./client-page";

const title = "Sign Up | Beyond Digital Media";
const description = "Create a Beyond Digital Media account to access your profile and features.";
const canonicalUrl = new URL("/signup", Config.baseUrl).href;

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

export default function SignUpPage() {
  return <SignUpClientPage />;
}
