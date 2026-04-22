import { createPageMetadata, pageMetadata } from "@/app/metadata";
import SignUpClientPage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.signUp);

export default function SignUpPage() {
  return <SignUpClientPage />;
}
