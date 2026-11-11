"use client"

import Link from "next/link"
import { useMemo } from "react"

import { useGameQuery } from "@/hooks/use-game-query"
import type { AccountId } from "@/lib/accounts"
import { formatGameDate } from "@/lib/format"
import { filterGames, LOAD_MORE_BATCH, sortGames } from "@/lib/game-query"
import { RESULT_LETTER } from "@/lib/game-text"
import type { GameView } from "@/lib/game-view"

type GameBrowserProps = {
  accountId: AccountId
  games: GameView[]
}

// Placeholder list for the routing step. The cards, hero, search and filters
// replace it in the next block.
export function GameBrowser({ accountId, games }: GameBrowserProps) {
  const { query, updateQuery } = useGameQuery()

  const filteredGames = useMemo(
    () => sortGames(filterGames(games, query), query.sort),
    [games, query],
  )
  const visibleGames = filteredGames.slice(0, query.page * LOAD_MORE_BATCH)
  const hasMore = visibleGames.length < filteredGames.length

  return (
    <section aria-label="Jogos" className="flex flex-col gap-2 py-4">
      <p className="text-sm text-text-muted">
        {filteredGames.length === 1 ? "1 jogo" : `${filteredGames.length} jogos`}
      </p>
      <ul className="flex flex-col gap-2">
        {visibleGames.map((game) => (
          <li key={game.uuid}>
            <Link
              href={`/${accountId}/jogo/${game.uuid}`}
              className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-surface px-3 py-2 tabular-nums"
            >
              <span className="w-5 font-display font-bold">{RESULT_LETTER[game.result]}</span>
              <span className="flex-1 truncate">vs {game.opponent.username}</span>
              <span className="text-sm text-text-muted">{formatGameDate(game.endedAt)}</span>
              <span className="font-display font-bold">{game.rating}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => updateQuery({ page: query.page + 1 })}
          className="min-h-12 rounded-card border border-border bg-surface font-semibold"
        >
          Carregar mais {LOAD_MORE_BATCH}
        </button>
      ) : null}
    </section>
  )
}
