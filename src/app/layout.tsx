"use client";

import React, { useEffect, useState } from "react";
import { Inter, Noto_Sans_TC } from "next/font/google";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { ThemeProvider } from "../components/theme-provider";
import { Breadcrumb } from "../components/breadcrumb";
import "../styles/globals.css";
import "../lib/i18n";
import useTranslation from "../hooks/useTranslation";
import { Analytics } from "@vercel/analytics/react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

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

// Metadata moved to a separate file to avoid using both 'use client' and exporting metadata
// in the same file, which isn't allowed in Next.js app router

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { currentLanguage } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Fix for hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const queryClient = new QueryClient();

  return (
    <html lang={mounted ? currentLanguage : "zh-TW"} suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.variable} ${notoSansTC.variable} font-sans`}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-background/80">
              <header>
                <Navbar />
              </header>
              <Breadcrumb />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ThemeProvider>
        </QueryClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
