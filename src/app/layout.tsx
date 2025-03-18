import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Navbar from "../components/navbar"
import Footer from "../components/footer"
import { ThemeProvider } from "../components/theme-provider"
import "../styles/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "彼岸媒體",
  description: "Showcasing the artwork of Yi Yang, founder of 彼岸媒體",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>{/* <link rel="icon" href="/favicon.ico" sizes="any" /> */}</head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-background/80">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
