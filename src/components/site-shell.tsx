"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Navbar from "./navbar";
import Footer from "./footer";
import ChineseOnlyGuard from "./chinese-only-guard";
import { UnsavedChangesProvider } from "./unsaved-changes-provider";

export default function SiteShell({ children }: React.PropsWithChildren) {
  const pathname = usePathname();

  if (pathname === "/daily-blessing") {
    return <UnsavedChangesProvider><main id="main-content" tabIndex={-1} className="relative min-h-dvh outline-none">{children}</main></UnsavedChangesProvider>;
  }

  return (
    <UnsavedChangesProvider>
      <Header />
      <main id="main-content" tabIndex={-1} className="relative flex min-h-svh flex-col pt-(--header-height) pb-8 outline-none">
        <ChineseOnlyGuard>{children}</ChineseOnlyGuard>
      </main>
      <Navbar />
      <Footer />
    </UnsavedChangesProvider>
  );
}
