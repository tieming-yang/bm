import type { ReactNode } from "react";

import { createPageMetadata, pageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata(pageMetadata.contact);

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
