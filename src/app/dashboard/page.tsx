import { createPageMetadata, pageMetadata } from "@/app/metadata";

import DashboardClientPage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.dashboard);

export default function DashboardPage() {
  return <DashboardClientPage />;
}
