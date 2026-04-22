import { createPageMetadata, pageMetadata } from "@/app/metadata";
import ClientBeyondMusicPage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.beyondMusic);

export default function BeyondMusicPage() {
  return <ClientBeyondMusicPage />;
}
