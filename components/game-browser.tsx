"use client"

import { SlidersHorizontal } from "lucide-react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"

import { FilterSheet, type SheetFilters } from "@/components/filter-sheet"
import { GameCard } from "@/components/game-card"
import { GameTable } from "@/components/game-table"
import { RatingHero } from "@/components/rating-hero"
import { ResultChips } from "@/components/result-chips"
import { SearchField } from "@/components/search-field"
import { SelectField } from "@/components/select-field"
import { TablePagination } from "@/components/table-pagination"
import { useGameQuery } from "@/hooks/use-game-query"
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from "@/hooks/use-media-query"
import { getAccount, type AccountId } from "@/lib/accounts"
import { formatCount, formatMonthYear } from "@/lib/format"
import { countSheetFilters, filterGames, getAvailableYears, sortGames } from "@/lib/game-query"
import { COLOR_FILTER_OPTIONS, SORT_OPTIONS } from "@/lib/game-text"
import type { GameView } from "@/lib/game-view"
import { rememberListReturn } from "@/lib/list-return"

type GameBrowserProps = {
  accountId: AccountId
  /** Every game of the account, oldest first. */
  games: GameView[]
}

const ALL_YEARS = "all"

function formatGameCount(count: number) {
  return count === 1 ? "1 jogo" : `${formatCount(count)} jogos`
}

export function GameBrowser({ accountId, games }: GameBrowserProps) {
  const account = getAccount(accountId)
  const sheetId = useId()
  const resultsTitleId = useId()
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  // Remounts the search field on "Limpar filtros", dropping any text typed
  // in the last 300 ms that would otherwise be committed after the clear.
  const [searchFieldKey, setSearchFieldKey] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const pendingFocusIndexRef = useRef<number | null>(null)
  const { query, updateQuery, clearFilters } = useGameQuery()

  // A year from the URL with no games (?year=2019) still gets an option, so
  // the controls show it and it can be cleared.
  const years = useMemo(() => {
    const available = getAvailableYears(games)
    return query.year !== null && !available.includes(query.year)
      ? [query.year, ...available]
      : available
  }, [games, query.year])
  // Depends on the filter fields only: paging and sorting don't re-filter.
  const { q, result, color, year } = query
  const filteredGames = useMemo(
    () => filterGames(games, { q, result, color, year }),
    [games, q, result, color, year],
  )
  const sortedGames = useMemo(() => sortGames(filteredGames, query.sort), [filteredGames, query.sort])

  // "page" and "size" mean the same on both layouts: the table shows page N,
  // the mobile list shows everything up to the end of page N. A shared link
  // always includes the rows it pointed at. Only one layout is mounted.
  const pageCount = Math.max(1, Math.ceil(sortedGames.length / query.size))
  const currentPage = Math.min(query.page, pageCount)
  const visibleCards = sortedGames.slice(0, currentPage * query.size)
  const remainingCount = sortedGames.length - visibleCards.length
  const tableGames = sortedGames.slice((currentPage - 1) * query.size, currentPage * query.size)

  const sheetFilterCount = countSheetFilters(query)

  const commitSearch = useCallback((q: string) => updateQuery({ q }), [updateQuery])
  const applySheetFilters = useCallback(
    (filters: SheetFilters) => updateQuery(filters),
    [updateQuery],
  )
  const gameHref = useCallback(
    (game: GameView) => `/${accountId}/jogo/${encodeURIComponent(game.uuid)}`,
    [accountId],
  )
  const openGame = useCallback((game: GameView) => rememberListReturn(game.uuid), [])

  // "Limpar filtros" disappears once the results come back. Focus moves to
  // the results instead of dropping to <body>.
  function handleClearFilters() {
    clearFilters()
    setSearchFieldKey((key) => key + 1)
    resultsRef.current?.focus({ preventScroll: true })
  }

  // "Carregar mais" can disappear with the last batch. Focus moves to the
  // first new card so keyboard and screen reader users land on what loaded.
  function handleLoadMore() {
    pendingFocusIndexRef.current = visibleCards.length
    updateQuery({ page: currentPage + 1 })
  }

  // The table's pagination sits below it. After a page change, scroll to the
  // top of the results and move focus there. focus() alone only scrolls when
  // the element is off screen, and a tall table is always partly visible.
  function handleTablePageChange(page: number) {
    updateQuery({ page })
    resultsRef.current?.scrollIntoView({ block: "start" })
    resultsRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    const index = pendingFocusIndexRef.current
    if (index === null) return
    pendingFocusIndexRef.current = null
    listRef.current?.querySelectorAll<HTMLAnchorElement>("a")[index]?.focus()
  }, [visibleCards.length])

  if (games.length === 0) {
    return (
      <p className="py-12 text-center text-base text-text-secondary">
        Essa conta ainda não tem partidas no Chess.com.
      </p>
    )
  }

  return (
    <>
      <p className="hidden pb-2 text-base text-text-secondary md:block">
        {games.length === 1 ? "1 partida" : `${formatCount(games.length)} partidas`} na conta{" "}
        {account.username} do Chess.com, desde {formatMonthYear(games[0].endedAt)}.
      </p>

      <RatingHero
        games={games}
        filteredGames={filteredGames}
        year={query.year}
        timeClass={account.timeClass}
      />

      <div className="flex flex-col gap-2 pt-4 md:flex-row md:flex-wrap md:items-center md:gap-3 md:pt-6">
        <div className="flex gap-2 md:min-w-[280px] md:flex-1">
          <SearchField key={searchFieldKey} value={query.q} onCommit={commitSearch} />
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
            className="relative flex size-12 shrink-0 items-center justify-center rounded-control border border-border bg-surface transition-colors duration-150 hover:border-border-strong active:bg-surface-pressed md:hidden"
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

        {/* On desktop the sheet's filters sit inline. */}
        <div className="hidden gap-3 md:flex">
          <SelectField
            label="Cor"
            value={query.color}
            options={COLOR_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.selectLabel,
            }))}
            onChange={(color) => updateQuery({ color })}
          />
          <SelectField
            label="Ano"
            value={query.year === null ? ALL_YEARS : String(query.year)}
            options={[
              { value: ALL_YEARS, label: "Todos os anos" },
              ...years.map((year) => ({ value: String(year), label: String(year) })),
            ]}
            onChange={(year) => updateQuery({ year: year === ALL_YEARS ? null : Number(year) })}
          />
        </div>
      </div>

      <section
        ref={resultsRef}
        tabIndex={-1}
        aria-labelledby={resultsTitleId}
        className="scroll-mt-4 pt-2 focus-visible:outline-none"
      >
        <h2 id={resultsTitleId} className="sr-only">
          Lista de jogos
        </h2>

        <div className="flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm text-text-muted tabular-nums">
            {formatGameCount(sortedGames.length)}
          </p>
          <SelectField
            label="Ordenar"
            variant="plain"
            value={query.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => updateQuery({ sort })}
          />
        </div>

        {sortedGames.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-base text-text-secondary">Nenhum jogo com esses filtros.</p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-12 rounded-card border border-border bg-surface px-5 text-base font-semibold transition-colors duration-150 hover:border-border-strong active:bg-surface-pressed"
            >
              Limpar filtros
            </button>
          </div>
        ) : isDesktop ? (
          <div className="pt-2">
            <GameTable
              accountId={accountId}
              games={tableGames}
              caption={`Jogos da conta ${account.username}, página ${currentPage} de ${pageCount}`}
              gameHref={gameHref}
              onOpenGame={openGame}
            />
            <TablePagination
              currentPage={currentPage}
              pageCount={pageCount}
              pageSize={query.size}
              totalCount={sortedGames.length}
              onPageChange={handleTablePageChange}
              onPageSizeChange={(size) => updateQuery({ size })}
            />
          </div>
        ) : (
          <>
            <ul ref={listRef} className="flex flex-col gap-2 pt-1 pb-4">
              {visibleCards.map((game) => (
                <li key={game.uuid}>
                  <GameCard
                    game={game}
                    href={gameHref(game)}
                    accountTimeClass={account.timeClass}
                    onNavigate={() => openGame(game)}
                  />
                </li>
              ))}
            </ul>
            {remainingCount > 0 ? (
              <button
                type="button"
                onClick={handleLoadMore}
                className="mb-4 min-h-12 w-full rounded-card border border-border bg-surface text-base font-semibold transition-colors duration-150 hover:border-border-strong active:bg-surface-pressed"
              >
                Carregar mais {Math.min(query.size, remainingCount)}
              </button>
            ) : null}
          </>
        )}
      </section>

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
