import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Jogos SleepRun",
  description: "Jogos SleepRun - Criado por Rafael Siqueira",
}

export const revalidate = 3600 * 20 // revalidate at most every 20 hours

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-green-950 text-gray-200`}
      >
        {children}
      </body>
    </html>
  )
}
