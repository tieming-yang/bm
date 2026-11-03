import { createPageMetadata, pageMetadata } from "@/app/metadata";

import RegistrationClosed from "./registration-closed";

export const metadata = createPageMetadata(pageMetadata.schoolSummer2026Registration);

export default function SummerCampRegistrationPage() {
  return <RegistrationClosed />;
}
