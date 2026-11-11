"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"

import { BackToListLink } from "@/components/game-detail/back-to-list-link"
import { LoadError } from "@/components/load-error"
import { getChessComArchiveUrl } from "@/lib/accounts"

export default function GameError({ error, retry }: { error: unknown; retry: () => void }) {
  const { account, uuid } = useParams<{ account: string; uuid: string }>()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex flex-col focus-visible:outline-none md:max-w-[720px]"
    >
      {/* Same link as the game page: it goes back in history when the reader
          came from the list, keeping their filters and scroll. */}
      <div className="-mx-1 pt-3">
        <BackToListLink accountId={encodeURIComponent(account)} uuid={uuid} />
      </div>
      <LoadError retry={retry} archiveUrl={getChessComArchiveUrl(account)} headingLevel="h1" />
    </main>
  )
}
