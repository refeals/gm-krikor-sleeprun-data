"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import {
  CLEARED_FILTERS,
  parseGameQuery,
  serializeGameQuery,
  type GameQuery,
} from "@/lib/game-query"

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
  const query = useMemo(() => parseGameQuery(searchParams), [searchParams])

  // Patches the URL as it is now, not as of the last render: two writes in
  // the same tick (a debounced search and a chip click) both survive. Any
  // change sends the reader back to the first page unless the patch sets one.
  const updateQuery = useCallback((patch: Partial<GameQuery>) => {
    const current = parseGameQuery(new URLSearchParams(window.location.search))
    const next: GameQuery = { ...current, page: 1, ...patch }
    window.history.replaceState(null, "", `${window.location.pathname}${serializeGameQuery(next)}`)
  }, [])

  const clearFilters = useCallback(() => updateQuery(CLEARED_FILTERS), [updateQuery])

  return { query, updateQuery, clearFilters }
}
