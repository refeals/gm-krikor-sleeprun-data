import { formatRatingDelta } from "@/lib/format"
import { COLOR_LABEL, RESULT_LABEL, RESULT_LETTER } from "@/lib/game-text"
import type { GameResult, GameView, PieceColor } from "@/lib/game-view"
import { cn } from "@/lib/utils"

const RESULT_BACKGROUND: Record<GameResult, string> = {
  win: "bg-win",
  draw: "bg-draw",
  loss: "bg-loss",
}

/** V/E/D square. The letter is decoration; the full word is read out. */
export function ResultBadge({ result }: { result: GameResult }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-control font-display text-lg font-bold text-on-accent",
        RESULT_BACKGROUND[result],
      )}
    >
      <span aria-hidden>{RESULT_LETTER[result]}</span>
      <span className="sr-only">{RESULT_LABEL[result]}</span>
    </span>
  )
}

export function ResultPill({ result }: { result: GameResult }) {
  return (
    <span
      className={cn(
        "inline-flex self-start rounded-full px-2.5 py-1 text-sm font-bold text-on-accent",
        RESULT_BACKGROUND[result],
      )}
    >
      {RESULT_LABEL[result]}
    </span>
  )
}

/** Small square in the piece color. Decorative: pair it with text for screen readers. */
export function PieceSquare({ color, size = "sm" }: { color: PieceColor; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      title={COLOR_LABEL[color]}
      className={cn(
        "shrink-0 rounded-[3px] border border-disabled",
        size === "sm" ? "size-2.5" : "size-3",
        color === "white" ? "bg-piece-white" : "bg-bg",
      )}
    />
  )
}

/** "+8" / "−7" / "±0", or "nova run" when the rating was reset before this game. */
export function RatingChange({ game }: { game: Pick<GameView, "ratingDelta" | "isRunStart"> }) {
  if (game.isRunStart) {
    return <span className="text-xs font-semibold text-text-muted">nova run</span>
  }
  if (game.ratingDelta === null) return null

  return (
    <span
      className={cn(
        "text-xs font-semibold tabular-nums",
        game.ratingDelta > 0 && "text-win",
        game.ratingDelta < 0 && "text-loss",
        game.ratingDelta === 0 && "text-text-muted",
      )}
    >
      {formatRatingDelta(game.ratingDelta)}
    </span>
  )
}
