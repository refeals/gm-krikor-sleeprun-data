"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import { parseGameQuery, serializeGameQuery, type GameQuery } from "@/lib/game-query"

/**
 * Reads and writes the list state in the URL. The URL is the only source of
 * truth, so going back from a game restores the filters.
 */
export function useGameQuery() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const query = useMemo(() => parseGameQuery(searchParams), [searchParams])

  // Any change sends the reader back to the first page unless the patch sets one.
  const updateQuery = useCallback(
    (patch: Partial<GameQuery>) => {
      const next: GameQuery = { ...query, page: 1, ...patch }
      router.replace(`${pathname}${serializeGameQuery(next)}`, { scroll: false })
    },
    [pathname, query, router],
  )

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return { query, updateQuery, clearFilters }
}
