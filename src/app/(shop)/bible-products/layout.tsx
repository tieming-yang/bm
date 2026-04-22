import type { ReactNode } from "react";

import { createPageMetadata, pageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata(pageMetadata.bibleProducts);

export default function BibleProductsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
