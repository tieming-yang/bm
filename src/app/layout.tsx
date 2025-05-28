import { Kings, Eagle_Lake, Yuji_Mai } from "next/font/google";
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
import _metadata from "./metadata";
import localFont from "next/font/local";
import Header from "@/components/header";

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

export const metadata: Metadata = _metadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      suppressHydrationWarning
      className={`${eagleLake.variable} ${yujiMai.variable} antialiased`}
    >
      <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <ReactQueryProvider>
          <ClientRoot>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              // enableSystem
              disableTransitionOnChange
            >
              <div className="flex flex-col min-h-screen">
                <Suspense fallback={<Loading />}>
                  <Header />
                  <Breadcrumb />
                  <main className="flex-1">{children}</main>
                  <Navbar />
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
