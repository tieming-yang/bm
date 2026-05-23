import { Kings, Eagle_Lake, Yuji_Mai } from "next/font/google";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { ThemeProvider } from "../components/theme-provider";
import "../styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import Loading from "@/app/loading";
import ReactQueryProvider from "@/providers/react-query-provider";
import ClientRoot from "./client-layout";
import type { Metadata, Viewport } from "next";
import rootMetadata from "./metadata";
import Header from "@/components/header";
import ChineseOnlyGuard from "@/components/chinese-only-guard";

import { GoogleAnalytics } from "@next/third-parties/google";

const kings = Kings({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-kings",
  display: "swap",
});

const eagleLake = Eagle_Lake({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-eagle-lake",
  display: "swap",
});

const yujiMai = Yuji_Mai({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-yuji-mai",
  display: "swap",
});

// TODO: Not working, bug in next.js
// const chineseFont = localFont({
//   src: "./YujiMai-Regular.woff2",
//   display: "swap",
// });

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={`${eagleLake.variable} ${yujiMai.variable} antialiased dark`}
      data-theme="dark"
      style={{
        colorScheme: "dark",
        scrollBehavior: "smooth",
      }}
    >
      <GoogleAnalytics gaId="G-R13X1H6G19" />

      <body>
        <ReactQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            forcedTheme="dark"
            enableColorScheme
            disableTransitionOnChange
          >
            <Suspense fallback={<Loading />}>
              <ClientRoot>
                <Header />
                <main className="relative flex flex-col">
                  <ChineseOnlyGuard>{children}</ChineseOnlyGuard>
                </main>
                <Navbar />
                <Footer />
              </ClientRoot>
              <Toaster position="top-center" />
            </Suspense>
          </ThemeProvider>
        </ReactQueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
