"use client"

import { ExternalLink } from "lucide-react"

import { useTransientFlag } from "@/hooks/use-transient-flag"
import { copyText } from "@/lib/clipboard"

const FEEDBACK_MS = 2000

type GameActionsProps = {
  url: string | null
  pgn: string
}

/**
 * Sticks to the bottom of the screen on mobile while the game is in view, then
 * settles at the end of <main> so the site footer below stays reachable.
 * Inline from 768px.
 */
export function GameActions({ url, pgn }: GameActionsProps) {
  const [isCopied, showCopied] = useTransientFlag(FEEDBACK_MS)

  async function handleCopy() {
    if (await copyText(pgn)) showCopied()
  }

  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t border-border bg-bg px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] md:static md:mx-0 md:mt-0 md:border-0 md:bg-transparent md:p-0">
      <div className="flex flex-col gap-2 md:flex-row">
        {url ? (
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
        ) : null}
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-12 rounded-card border border-border bg-surface px-6 text-base font-semibold transition-colors duration-150 hover:border-border-strong cursor-pointer"
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
