import { createPageMetadata, pageMetadata } from "@/app/metadata";
import PriceSection from "../../components/pricing-section";

export const metadata = createPageMetadata(pageMetadata.gloryShareJoin);

export default function JoinPage() {
  return (
    <PriceSection />
  )
}
