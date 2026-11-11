import type { Metadata, Viewport } from "next"
import Script from "next/script"

import { fontVariables } from "@/app/fonts"
import { SiteFooter } from "@/components/site-footer"

import "./globals.css"

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

const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-accent focus:px-4 focus:py-3 focus:font-semibold focus:text-on-accent"
        >
          Pular para o conteúdo
        </a>
        {children}
        <SiteFooter />
        {umamiWebsiteId ? (
          <Script
            src="https://umami.rafaelsiqueira.dev/script.js"
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  )
}
