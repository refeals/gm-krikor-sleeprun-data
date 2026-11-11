"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"

import { LoadError } from "@/components/load-error"
import { getChessComArchiveUrl } from "@/lib/accounts"

// Shown when the data layer throws, almost always because Chess.com failed.
// The header from the layout stays, so the reader can try the other account.
export default function BrowseError({ error, retry }: { error: unknown; retry: () => void }) {
  const { account } = useParams<{ account: string }>()

  useEffect(() => {
    console.error(error)
  }, [error])

  return <LoadError retry={retry} archiveUrl={getChessComArchiveUrl(account)} />
}
