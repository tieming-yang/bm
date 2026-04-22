import { createPageMetadata, pageMetadata } from "@/app/metadata";
import SignInClientPage from "./client-page";

export const metadata = createPageMetadata(pageMetadata.signIn);

export default function SignInPage() {
  return <SignInClientPage />;
}
