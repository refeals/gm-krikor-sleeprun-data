import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"

import { FocusMainOnMount } from "@/components/focus-main-on-mount"
import { BackToListLink } from "@/components/game-detail/back-to-list-link"
import { GameActions } from "@/components/game-detail/game-actions"
import { PlayerRows } from "@/components/game-detail/player-rows"
import { ShareButton } from "@/components/game-detail/share-button"
import { ResultPill } from "@/components/game-marks"
import type { AccountId } from "@/lib/accounts"
import { fetchAccountGames } from "@/lib/chess-com"
import { formatFullDate, formatRatingDelta } from "@/lib/format"
import { describeGame, formatGameFormat, formatMoveCount } from "@/lib/game-text"
import { isGameUuid, toGameViews, type GameResult, type GameView } from "@/lib/game-view"
import { requireAccount } from "@/lib/route-params"
import { cn } from "@/lib/utils"

// No game page is built ahead of time. Each one renders on its first visit
// and is then cached; an empty list is what enables that (ISR).
export function generateStaticParams(): { account: string; uuid: string }[] {
  return []
}

// A finished game never changes, but the page reads the current month to find
// it, and a fetch with a shorter revalidate lowers the whole route to it. Made
// explicit here: a visited game page regenerates at most every 5 minutes.
export const revalidate = 300

const BANNER_CLASS: Record<GameResult, string> = {
  win: "border-banner-win-border bg-banner-win-bg",
  draw: "border-banner-draw-border bg-banner-draw-bg",
  loss: "border-banner-loss-border bg-banner-loss-bg",
}

// Shared by generateMetadata and the page within one request.
const findGame = cache(async (accountId: AccountId, uuid: string) => {
  // Not a game id: 404 before any fetch, so random paths cost nothing.
  if (!isGameUuid(uuid)) return null
  // The rating delta depends on the previous game, so the whole history is
  // derived. Every month comes from the fetch cache.
  const rawGames = await fetchAccountGames(accountId)
  const game = toGameViews(rawGames, accountId).find((candidate) => candidate.uuid === uuid)
  const pgn = rawGames.find((candidate) => candidate.uuid === uuid)?.pgn
  return game && pgn !== undefined ? { game, pgn } : null
})

function describeRating(game: GameView): string {
  if (game.isRunStart) return `Rating ${game.rating}, início de run`
  if (game.ratingDelta === null) return `Rating ${game.rating}`
  return `Rating ${game.rating} (${formatRatingDelta(game.ratingDelta)})`
}

export async function generateMetadata({
  params,
}: PageProps<"/[account]/jogo/[uuid]">): Promise<Metadata> {
  const [account, { uuid }] = await Promise.all([requireAccount(params), params])
  const found = await findGame(account.id, uuid)
  return found ? { title: `${describeGame(found.game)} | ${account.label}` } : {}
}

export default async function GamePage({ params }: PageProps<"/[account]/jogo/[uuid]">) {
  const [account, { uuid }] = await Promise.all([requireAccount(params), params])
  const found = await findGame(account.id, uuid)
  if (!found) notFound()
  const { game, pgn } = found
  const headline = describeGame(game)

  return (
    // At least a screen tall on mobile, so the sticky actions start at the
    // bottom edge and the footer sits just below the fold.
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh flex-col gap-6 focus-visible:outline-none md:min-h-0 md:max-w-[720px] mx-auto"
    >
      <FocusMainOnMount />
      <header className="-mx-1 flex items-center justify-between pt-3">
        <BackToListLink accountId={account.id} uuid={uuid} />
        <ShareButton title={headline} />
      </header>

      <section className={cn("flex flex-col gap-2 rounded-card border p-5", BANNER_CLASS[game.result])}>
        <ResultPill result={game.result} />
        <h1 className="font-display text-2xl font-bold">{headline}</h1>
        <p className="text-sm text-text-secondary">
          {formatGameFormat(game)}, {formatFullDate(game.endedAt)}
        </p>
        <p className="text-sm text-text-secondary tabular-nums">{describeRating(game)}</p>
      </section>

      <PlayerRows game={game} />

      <dl className="divide-y divide-border-subtle border-y border-border-subtle">
        <div className="flex gap-4 py-3">
          <dt className="w-24 shrink-0 pt-0.5 text-sm text-text-muted">Abertura</dt>
          <dd className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base font-semibold">{game.openingName ?? "Desconhecida"}</span>
            {game.ecoCode ? <span className="text-xs text-text-muted">ECO {game.ecoCode}</span> : null}
          </dd>
        </div>
        <div className="flex items-center gap-4 py-3">
          <dt className="w-24 shrink-0 text-sm text-text-muted">Lances</dt>
          <dd className="font-display text-xl font-bold tabular-nums">
            <span aria-hidden>{game.moveCount}</span>
            <span className="sr-only">{formatMoveCount(game.moveCount)}</span>
          </dd>
        </div>
      </dl>

      <GameActions url={game.url} pgn={pgn} />
    </main>
  )
}
