import Link from "next/link"

import { PieceSquare, RatingChange, ResultBadge } from "@/components/game-marks"
import { LinkPendingBar } from "@/components/link-pending"
import { formatAccuracy, formatGameDate } from "@/lib/format"
import { formatGameFormat } from "@/lib/game-text"
import type { GameView } from "@/lib/game-view"

type GameCardProps = {
  game: GameView
  href: string
  /** The account's own format. Games in another format show theirs. */
  accountTimeClass: string
  onNavigate: () => void
}

function buildMeta(game: GameView, accountTimeClass: string): string {
  const parts: string[] = []
  if (game.timeClass !== accountTimeClass || game.rules !== "chess") {
    parts.push(formatGameFormat(game))
  }
  if (game.accuracy) parts.push(`precisão ${formatAccuracy(game.accuracy.own)}`)
  parts.push(formatGameDate(game.endedAt))
  const meta = parts.join(", ")
  return meta.charAt(0).toUpperCase() + meta.slice(1)
}

export function GameCard({ game, href, accountTimeClass, onNavigate }: GameCardProps) {
  return (
    <Link
      href={href}
      // Game pages are generated on first visit. Prefetching every card in
      // view would make the server build dozens of them per list visit.
      prefetch={false}
      onClick={onNavigate}
      className="relative flex items-center gap-3 rounded-card border border-border bg-surface p-3 transition-colors duration-150 hover:border-border-strong active:bg-surface-pressed"
    >
      <LinkPendingBar />
      <ResultBadge result={game.result} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-base font-semibold">
          <PieceSquare color={game.color} />
          <span className="truncate">vs {game.opponent.username}</span>
          <span className="shrink-0 text-xs font-medium text-text-muted tabular-nums">
            {game.opponent.rating}
          </span>
          <span className="sr-only">, Krikor de {game.color === "white" ? "brancas" : "pretas"}</span>
        </span>
        <span className="truncate text-sm text-text-secondary">
          {game.openingName ?? "Abertura desconhecida"}
        </span>
        <span className="text-xs text-text-muted tabular-nums">{buildMeta(game, accountTimeClass)}</span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-display text-lg font-bold tabular-nums">
          <span className="sr-only">Rating </span>
          {game.rating}
        </span>
        <RatingChange game={game} />
      </span>
    </Link>
  )
}
