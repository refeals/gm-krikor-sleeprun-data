"use client"

import { TriangleAlert } from "lucide-react"

type LoadErrorProps = {
  retry: () => void
  /** The account's game archive on Chess.com, the way out while the API is down. */
  archiveUrl: string
  /** h1 where the page has no other title (the game page), h2 under the list header. */
  headingLevel?: "h1" | "h2"
}

/**
 * Every failure shows this message. In production the error's text is not
 * sent to the browser, so a Chess.com outage can't be told apart from a bug
 * here; in practice the data layer's errors come from Chess.com.
 */
export function LoadError({ retry, archiveUrl, headingLevel = "h2" }: LoadErrorProps) {
  const Heading = headingLevel

  function handleRetry() {
    // The button disappears when the retry succeeds. Moving focus to <main>
    // first keeps it on the page instead of dropping to <body>.
    document.getElementById("main-content")?.focus()
    retry()
  }

  return (
    <div role="alert" className="mx-auto flex max-w-[420px] flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-18 items-center justify-center rounded-card border border-border bg-surface">
        <TriangleAlert aria-hidden className="size-8 text-accent" strokeWidth={1.8} />
      </div>
      <Heading className="font-display text-2xl font-bold">O Chess.com não respondeu</Heading>
      <p className="text-base text-text-secondary">
        A lista de jogos vem da API pública do Chess.com. Tente de novo em alguns minutos.
      </p>
      <div className="mt-2 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={handleRetry}
          className="min-h-13 rounded-card bg-accent px-6 text-md font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
        >
          Tentar de novo
        </button>
        <a
          href={archiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-card border border-border bg-surface px-6 text-base font-semibold transition-colors duration-150 hover:border-border-strong"
        >
          Ver jogos no Chess.com
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
    </div>
  )
}
