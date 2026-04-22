import { createPageMetadata, pageMetadata } from "@/app/metadata";
import { AuroraHero } from "@/components/aurora-hero";
import ClientHome from "./client-home";

export const metadata = createPageMetadata(pageMetadata.home);

export default function HomePage() {
  return (
    <AuroraHero>
      <ClientHome />
    </AuroraHero>
  );
}
