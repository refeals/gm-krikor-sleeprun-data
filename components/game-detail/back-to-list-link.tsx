"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { MouseEvent } from "react"

import { cameFromList } from "@/lib/list-return"
import { isModifiedClick } from "@/lib/events"

type BackToListLinkProps = {
  accountId: string
  uuid: string
}

/**
 * Goes back in history when the reader came from the list, which restores its
 * filters and scroll position. From a shared link it opens the list instead.
 */
export function BackToListLink({ accountId, uuid }: BackToListLinkProps) {
  const router = useRouter()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) return
    if (cameFromList(uuid) && window.history.length > 1) {
      event.preventDefault()
      router.back()
    }
  }

  return (
    <Link
      href={`/${accountId}`}
      onClick={handleClick}
      className="inline-flex min-h-11 items-center gap-1 rounded-control pr-3 pl-1 text-base font-semibold"
    >
      <ChevronLeft aria-hidden className="size-5" />
      Jogos
    </Link>
  )
}
