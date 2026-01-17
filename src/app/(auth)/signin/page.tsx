import type { Metadata } from "next";
import Config from "@/models/config";
import SignInClientPage from "./client-page";

const title = "Sign In | Beyond Digital Media";
const description = "Sign in to your Beyond Digital Media account to access your profile.";
const canonicalUrl = new URL("/signin", Config.baseUrl).href;

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

export default function SignInPage() {
  return <SignInClientPage />;
}
