import { createPageMetadata, pageMetadata } from "@/app/metadata";
import ClientARPage from "./client-ar-page";

export const metadata = createPageMetadata(pageMetadata.ar);

export default function ARPage() {
  return <ClientARPage />;
}
