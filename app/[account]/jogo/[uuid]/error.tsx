"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect } from "react"

import { LoadError } from "@/components/load-error"
import { getChessComArchiveUrl } from "@/lib/accounts"

export default function GameError({ error, retry }: { error: unknown; retry: () => void }) {
  const { account } = useParams<{ account: string }>()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col focus-visible:outline-none md:max-w-[720px]">
      <div className="-mx-1 pt-3">
        <Link
          href={`/${encodeURIComponent(account)}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-control pr-3 pl-1 text-base font-semibold"
        >
          <ChevronLeft aria-hidden className="size-5" />
          Jogos
        </Link>
      </div>
      <LoadError retry={retry} archiveUrl={getChessComArchiveUrl(account)} headingLevel="h1" />
    </main>
  )
}
