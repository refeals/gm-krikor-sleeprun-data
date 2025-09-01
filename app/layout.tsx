import Providers from "@/app/providers"
import type { Metadata } from "next"
import { Roboto } from "next/font/google"
import "./globals.css"

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Jogos SleepRun",
  description: "Jogos SleepRun - Criado por Rafael Siqueira",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${roboto.className} antialiased bg-green-950 text-gray-200`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
