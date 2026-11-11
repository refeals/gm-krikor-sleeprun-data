"use client"

import { ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"

import { copyText } from "@/lib/clipboard"

const FEEDBACK_MS = 2000

type GameActionsProps = {
  url: string
  pgn: string
}

/** Fixed to the bottom of the screen on mobile, inline from 768px. */
export function GameActions({ url, pgn }: GameActionsProps) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setIsCopied(false), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [isCopied])

  async function handleCopy() {
    if (await copyText(pgn)) setIsCopied(true)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] md:static md:border-0 md:bg-transparent md:p-0">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 md:flex-row">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-13 items-center justify-center gap-2 rounded-card bg-accent px-6 text-md font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
        >
          Abrir no Chess.com
          <ExternalLink aria-hidden className="size-4.5" />
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-12 rounded-card border border-border bg-surface px-6 text-base font-semibold transition-colors duration-150 hover:border-border-strong"
        >
          {isCopied ? "PGN copiado" : "Copiar PGN"}
        </button>
        <span role="status" className="sr-only">
          {isCopied ? "PGN copiado" : ""}
        </span>
      </div>
    </div>
  )
}
