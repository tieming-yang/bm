import type { ReactNode } from "react";

import { createPageMetadata, pageMetadata } from "@/app/metadata";

export const metadata = createPageMetadata(pageMetadata.dailyGraceSnacks);

export default function DailyGraceSnacksLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
