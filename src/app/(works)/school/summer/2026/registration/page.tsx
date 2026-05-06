import { createPageMetadata, pageMetadata } from "@/app/metadata";

import RegistrationClientPage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.schoolSummer2026Registration);

export default function SummerCampRegistrationPage() {
  return <RegistrationClientPage />;
}
