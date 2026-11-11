import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"

import { SiteFooter } from "@/components/site-footer"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "Jogos do GM Krikor no SleepRun",
  description:
    "Partidas do GM Krikor Mekhitarian nas contas SleepReRun e SpeedBemRuim do Chess.com.",
}

export const viewport: Viewport = {
  themeColor: "#0e1411",
  colorScheme: "dark",
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
