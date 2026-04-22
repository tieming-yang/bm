import { createPageMetadata, pageMetadata } from "@/app/metadata";
import ClientBeyondArtPage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.beyondArt);

export default function BeyondArtPage() {
  return <ClientBeyondArtPage />;
}
