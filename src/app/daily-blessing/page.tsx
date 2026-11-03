import type { Viewport } from "next";
import { createPageMetadata, pageMetadata } from "@/app/metadata";
import Greet from "@/components/greet";

export const metadata = createPageMetadata(pageMetadata.greet);

export const viewport: Viewport = {
  themeColor: "#eee9de",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function GreetPage() {
  return <Greet />;
}
