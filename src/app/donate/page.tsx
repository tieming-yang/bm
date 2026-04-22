import { createPageMetadata, pageMetadata } from "@/app/metadata";
import ClientDonatePage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.donate);

export default function DonatePage() {
  return <ClientDonatePage />;
}
