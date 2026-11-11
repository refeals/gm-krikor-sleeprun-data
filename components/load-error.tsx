"use client"

import { TriangleAlert } from "lucide-react"

import { StatusButton, StatusLink, StatusScreen } from "@/components/status-screen"

type LoadErrorProps = {
  retry: () => void
  /** The account's game archive on Chess.com, the way out while the API is down. */
  archiveUrl: string
  /** h1 where the page has no other title (the game page), h2 under the list header. */
  headingLevel?: "h1" | "h2"
}

/**
 * Shown when loading games fails. In production the error's text is not sent
 * to the browser, so a Chess.com outage can't be told apart from a bug here;
 * in practice the data layer's errors come from Chess.com.
 */
export function LoadError({ retry, archiveUrl, headingLevel = "h2" }: LoadErrorProps) {
  function handleRetry() {
    // The button disappears when the retry succeeds. Moving focus to <main>
    // first keeps it on the page instead of dropping to <body>.
    document.getElementById("main-content")?.focus()
    retry()
  }

  return (
    <StatusScreen
      role="alert"
      icon={TriangleAlert}
      title="O Chess.com não respondeu"
      headingLevel={headingLevel}
      description="A lista de jogos vem da API pública do Chess.com. Tente de novo em alguns minutos."
      actions={
        <>
          <StatusButton onClick={handleRetry}>Tentar de novo</StatusButton>
          <StatusLink variant="secondary" href={archiveUrl} isExternal>
            Ver jogos no Chess.com
          </StatusLink>
        </>
      }
    />
  )
}
