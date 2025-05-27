import { Inter, Noto_Sans_TC } from "next/font/google";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { ThemeProvider } from "../components/theme-provider";
import { Breadcrumb } from "../components/breadcrumb";
import "../styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import Loading from "@/components/loading";
import ReactQueryProvider from "@/providers/react-query-provider";
import ClientRoot from "./client-layout";
import { Metadata } from "next";

// Load Inter for Latin characters
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Load Noto Sans TC for Chinese characters
const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "彼岸數位媒體 | Beyond Digital Media",
  description:
    "彼岸數位媒體 | Beyond Digital Media 是一個致力於推廣基督教藝術和文化的非營利組織，旨在透過藝術作品傳遞福音信息。",
  openGraph: {
    images: "/logo.png",
  },
  other: {
    charset: "utf-8",
    "content-type": "text/html; charset=utf-8",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={"zh-TW"} suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.variable} ${notoSansTC.variable} font-sans`}>
        <ReactQueryProvider>
          <ClientRoot>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-background/80">
                <Navbar />
                <Breadcrumb />
                <Suspense fallback={<Loading />}>
                  <main className="flex-1">{children}</main>
                  <Toaster position="top-center" />
                  <Footer />
                </Suspense>
              </div>
            </ThemeProvider>
          </ClientRoot>
        </ReactQueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
