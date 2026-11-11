"use client"

import { SlidersHorizontal } from "lucide-react"
import { useCallback, useId, useMemo, useState } from "react"

import { FilterSheet, type SheetFilters } from "@/components/filter-sheet"
import { GameCard } from "@/components/game-card"
import { RatingHero } from "@/components/rating-hero"
import { ResultChips } from "@/components/result-chips"
import { SearchField } from "@/components/search-field"
import { SortSelect } from "@/components/sort-select"
import { useGameQuery } from "@/hooks/use-game-query"
import { getAccount, type AccountId } from "@/lib/accounts"
import { formatCount } from "@/lib/format"
import {
  countSheetFilters,
  filterGames,
  getAvailableYears,
  LOAD_MORE_BATCH,
  sortGames,
} from "@/lib/game-query"
import type { GameView } from "@/lib/game-view"
import { rememberListReturn } from "@/lib/list-return"

type GameBrowserProps = {
  accountId: AccountId
  /** Every game of the account, oldest first. */
  games: GameView[]
}

function formatGameCount(count: number) {
  return count === 1 ? "1 jogo" : `${formatCount(count)} jogos`
}

export function GameBrowser({ accountId, games }: GameBrowserProps) {
  const account = getAccount(accountId)
  const sheetId = useId()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const { query, updateQuery, clearFilters } = useGameQuery()

  const years = useMemo(() => getAvailableYears(games), [games])
  const filteredGames = useMemo(() => filterGames(games, query), [games, query])
  const sortedGames = useMemo(() => sortGames(filteredGames, query.sort), [filteredGames, query.sort])
  const visibleGames = sortedGames.slice(0, query.page * LOAD_MORE_BATCH)
  const remainingCount = sortedGames.length - visibleGames.length
  const sheetFilterCount = countSheetFilters(query)

  const commitSearch = useCallback((q: string) => updateQuery({ q }), [updateQuery])
  const applySheetFilters = useCallback(
    (filters: SheetFilters) => updateQuery(filters),
    [updateQuery],
  )

  if (games.length === 0) {
    return (
      <p className="py-12 text-center text-base text-text-secondary">
        Essa conta ainda não tem partidas no Chess.com.
      </p>
    )
  }

  return (
    <>
      <RatingHero
        games={games}
        filteredGames={filteredGames}
        year={query.year}
        timeClass={account.timeClass}
      />

      <div className="flex flex-col gap-2 pt-4">
        <div className="flex gap-2">
          <SearchField value={query.q} onCommit={commitSearch} />
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isSheetOpen}
            aria-controls={isSheetOpen ? sheetId : undefined}
            aria-label={
              sheetFilterCount === 0
                ? "Filtros"
                : `Filtros, ${sheetFilterCount} ${sheetFilterCount === 1 ? "ativo" : "ativos"}`
            }
            className="relative flex size-12 shrink-0 items-center justify-center rounded-control border border-border bg-surface transition-colors duration-150 hover:border-border-strong"
          >
            <SlidersHorizontal aria-hidden className="size-5" />
            {sheetFilterCount > 0 ? (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent tabular-nums"
              >
                {sheetFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <ResultChips value={query.result} onChange={(result) => updateQuery({ result })} />

        <div className="flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm text-text-muted tabular-nums">
            {formatGameCount(sortedGames.length)}
          </p>
          <SortSelect value={query.sort} onChange={(sort) => updateQuery({ sort })} />
        </div>
      </div>

      {sortedGames.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-base text-text-secondary">Nenhum jogo com esses filtros.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-12 rounded-card border border-border bg-surface px-5 text-base font-semibold transition-colors duration-150 hover:border-border-strong"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 pt-1 pb-4">
          {visibleGames.map((game) => (
            <li key={game.uuid}>
              <GameCard
                game={game}
                href={`/${accountId}/jogo/${game.uuid}`}
                accountTimeClass={account.timeClass}
                onNavigate={() => rememberListReturn(game.uuid)}
              />
            </li>
          ))}
        </ul>
      )}

      {remainingCount > 0 ? (
        <button
          type="button"
          onClick={() => updateQuery({ page: query.page + 1 })}
          className="mb-4 min-h-12 w-full rounded-card border border-border bg-surface text-base font-semibold transition-colors duration-150 hover:border-border-strong"
        >
          Carregar mais {Math.min(LOAD_MORE_BATCH, remainingCount)}
        </button>
      ) : null}

      {isSheetOpen ? (
        <FilterSheet
          id={sheetId}
          games={games}
          query={query}
          years={years}
          onApply={applySheetFilters}
          onClosed={() => setIsSheetOpen(false)}
        />
      ) : null}
    </>
  )
}
