"use client"

import { ExternalLink, Youtube } from "lucide-react"

import { useTransientValue } from "@/hooks/use-transient-flag"
import { copyText } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

const FEEDBACK_MS = 2000

const secondaryClassName =
  "min-h-12 flex-1 rounded-card border border-border bg-surface px-4 text-base font-semibold whitespace-nowrap transition-colors duration-150 hover:border-border-strong active:bg-surface-pressed md:flex-none md:px-6"

type GameActionsProps = {
  url: string | null
  /** The episode that shows the game, on YouTube. */
  videoUrl: string | null
  pgn: string
}

const COPY_LABEL = { idle: "Copiar PGN", copied: "PGN copiado", failed: "Erro ao copiar" }
const COPY_STATUS = {
  copied: "PGN copiado",
  failed: "Não foi possível copiar o PGN",
}

/**
 * Sticks to the bottom of the screen on mobile while the game is in view, then
 * settles at the end of <main> so the site footer below stays reachable.
 * Inline from 768px.
 */
export function GameActions({ url, videoUrl, pgn }: GameActionsProps) {
  const [copyResult, setCopyResult] = useTransientValue<"copied" | "failed">(FEEDBACK_MS)

  async function handleCopy() {
    setCopyResult((await copyText(pgn)) ? "copied" : "failed")
  }

  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t border-border bg-bg px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] md:static md:mx-0 md:mt-0 md:border-0 md:bg-transparent md:p-0">
      <div className="flex flex-col gap-2 md:flex-row">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-13 items-center justify-center gap-2 rounded-card bg-accent px-6 text-md font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover active:bg-accent-hover"
          >
            Abrir no Chess.com
            <ExternalLink aria-hidden className="size-4.5" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : null}
        {/* Side by side on mobile, so the sticky bar stays short. */}
        <div className="flex gap-2">
          {videoUrl ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(secondaryClassName, "flex items-center justify-center gap-2")}
            >
              <Youtube aria-hidden className="size-4.5 shrink-0" />
              <span className="sr-only">Assistir o episódio no </span>
              YouTube
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : null}
          <button type="button" onClick={handleCopy} className={secondaryClassName}>
            {COPY_LABEL[copyResult ?? "idle"]}
          </button>
        </div>
        <span role="status" className="sr-only">
          {copyResult ? COPY_STATUS[copyResult] : ""}
        </span>
      </div>
    </div>
  )
}
