"use client"

import { useEffect } from "react"

import { fontVariables } from "@/app/fonts"
import { PageError } from "@/components/page-error"

import "./globals.css"

// Replaces the root layout when the root layout itself fails, so it brings its
// own document, styles and fonts. Metadata exports don't work here; <title> does.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR" className={fontVariables}>
      <body>
        <title>Erro | SleepRun</title>
        <PageError retry={retry} />
      </body>
    </html>
  )
}
