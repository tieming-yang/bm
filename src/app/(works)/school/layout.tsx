import type { ReactNode } from "react";

import { createPageMetadata, pageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata(pageMetadata.school);

export default function SchoolLayout({ children }: { children: ReactNode }) {
  return children;
}
