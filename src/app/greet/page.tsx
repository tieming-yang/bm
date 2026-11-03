import { createPageMetadata, pageMetadata } from "@/app/metadata";
import Greet from "@/components/greet";

export const metadata = createPageMetadata(pageMetadata.greet);

export default function GreetPage() {
  return <Greet />;
}
