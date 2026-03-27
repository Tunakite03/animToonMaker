import { Geist_Mono, Source_Sans_3 } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { Providers } from "./provider"
import { cn } from "@/lib/utils"

const sourceSans3 = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "AnimToon Maker — AI Frame-by-Frame Animation",
  description:
    "Create smooth frame-by-frame animations using AI-generated images",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        sourceSans3.variable,
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
