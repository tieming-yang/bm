import type { ReactNode } from "react";

import { createPageMetadata, pageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata(pageMetadata.gloryShare);

export default function GloryShareLayout({ children }: { children: ReactNode }) {
  return children;
}
