import type { ReactNode } from "react";

import { createPageMetadata, pageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata(pageMetadata.about);

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
