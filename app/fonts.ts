import { Inter, Space_Grotesk } from "next/font/google"

// Shared by the root layout and global-error.tsx, which renders its own <html>.
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable}`
