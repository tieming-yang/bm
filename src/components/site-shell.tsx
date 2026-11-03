"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Navbar from "./navbar";
import Footer from "./footer";
import ChineseOnlyGuard from "./chinese-only-guard";

export default function SiteShell({ children }: React.PropsWithChildren) {
  const pathname = usePathname();

  if (pathname === "/daily-blessing") {
    return <main id="main-content" tabIndex={-1} className="relative min-h-dvh outline-none">{children}</main>;
  }

  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="relative flex min-h-svh flex-col pt-(--header-height) pb-8 outline-none">
        <ChineseOnlyGuard>{children}</ChineseOnlyGuard>
      </main>
      <Navbar />
      <Footer />
    </>
  );
}
