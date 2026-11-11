"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import { parseGameQuery, serializeGameQuery, type GameQuery } from "@/lib/game-query"

/**
 * Reads and writes the list state in the URL. The URL is the only source of
 * truth, so going back from a game restores the filters.
 *
 * Writes go through window.history.replaceState, which Next.js syncs with
 * useSearchParams without a server round trip. router.replace would refetch
 * the page payload, all games included, on every filter change.
 */
export function useGameQuery() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const query = useMemo(() => parseGameQuery(searchParams), [searchParams])

  // Any change sends the reader back to the first page unless the patch sets one.
  const updateQuery = useCallback(
    (patch: Partial<GameQuery>) => {
      const next: GameQuery = { ...query, page: 1, ...patch }
      window.history.replaceState(null, "", `${pathname}${serializeGameQuery(next)}`)
    },
    [pathname, query],
  )

  const clearFilters = useCallback(() => {
    window.history.replaceState(null, "", pathname)
  }, [pathname])

  return { query, updateQuery, clearFilters }
}
