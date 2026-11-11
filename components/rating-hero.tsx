"use client"

import { useMemo } from "react"

import { RatingSparkline } from "@/components/rating-sparkline"
import { formatAccuracy, formatCount, formatFullDate, MINUS_SIGN } from "@/lib/format"
import { buildRatingSeries, summarizeGames } from "@/lib/game-stats"
import type { GameView } from "@/lib/game-view"

type RatingHeroProps = {
  /** Every game of the account, oldest first. */
  games: readonly GameView[]
  /** Games matching all current filters. */
  filteredGames: readonly GameView[]
  year: number | null
  timeClass: string
}

/**
 * Mobile: rating and peak, the line, then score and accuracy, stacked.
 * From 768px: three columns, with the line taking the free width.
 */
export function RatingHero({ games, filteredGames, year, timeClass }: RatingHeroProps) {
  // Rating and its line follow the account's own format only: variants and
  // other time classes have separate ratings. The line follows the year
  // filter and nothing else.
  const formatGames = useMemo(
    () => games.filter((game) => game.rules === "chess" && game.timeClass === timeClass),
    [games, timeClass],
  )
  const periodGames = useMemo(
    () => (year === null ? formatGames : formatGames.filter((game) => game.year === year)),
    [formatGames, year],
  )
  const series = useMemo(() => buildRatingSeries(periodGames), [periodGames])
  const summary = useMemo(() => summarizeGames(filteredGames), [filteredGames])

  const currentRating = formatGames.at(-1)?.rating
  if (currentRating === undefined) return null

  // Extremes come from every game in the period, not from the line, which
  // keeps only each day's last game and would miss an intraday peak or low.
  const ratings = periodGames.map((game) => game.rating)
  const peak = ratings.length > 0 ? Math.max(...ratings) : currentRating
  const lowest = ratings.length > 0 ? Math.min(...ratings) : currentRating
  const runCount = new Set(series.map((point) => point.runIndex)).size
  const hasLine = series.length > 1
  const sparklineLabel = hasLine
    ? `Rating de ${lowest} a ${peak} entre ${formatFullDate(series[0].endedAt)} e ${formatFullDate(series[series.length - 1].endedAt)}` +
      (runCount > 1 ? `, em ${runCount} runs` : "")
    : ""

  return (
    <section
      aria-label="Resumo"
      className="flex flex-col gap-3 pt-4 pb-2 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end md:gap-8 md:pt-6"
    >
      <div className="flex items-end justify-between gap-4 md:flex-col md:items-start md:gap-1">
        <div className="flex flex-col">
          <span className="font-display text-5xl font-bold tabular-nums md:text-6xl">
            {currentRating}
          </span>
          <span className="text-xs text-text-muted">rating atual</span>
        </div>
        {hasLine ? (
          <span className="pb-0.5 text-xs text-text-muted">
            pico{" "}
            <span className="font-display text-base font-bold text-text-secondary tabular-nums">
              {peak}
            </span>
          </span>
        ) : null}
      </div>

      {hasLine ? (
        // Keyed by the period so a hover position from another series never carries over.
        <RatingSparkline
          key={year ?? "all"}
          points={series}
          label={sparklineLabel}
          className="h-16 md:h-24"
        />
      ) : (
        <div aria-hidden className="hidden md:block" />
      )}

      <div className="flex items-end justify-between gap-4 md:flex-col md:items-end md:gap-3">
        <div className="flex flex-col md:items-end">
          {/* aria-label is ignored on a plain span, so the score is read from sr-only text. */}
          <span className="sr-only">
            {summary.wins} vitórias, {summary.draws} empates, {summary.losses} derrotas
          </span>
          <span
            aria-hidden
            className="font-display text-xl font-bold whitespace-nowrap tabular-nums"
          >
            <span className="text-win">+{summary.wins}</span>{" "}
            <span className="text-draw">={summary.draws}</span>{" "}
            <span className="text-loss">
              {MINUS_SIGN}
              {summary.losses}
            </span>
          </span>
          <span className="text-xs text-text-muted">placar</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="font-display text-xl font-bold tabular-nums">
            {summary.accuracyAverage === null ? "—" : formatAccuracy(summary.accuracyAverage)}
          </span>
          <span className="text-xs text-text-muted">
            {summary.analyzedCount === 0
              ? "nenhum jogo analisado"
              : `precisão média de ${formatCount(summary.analyzedCount)} ${summary.analyzedCount === 1 ? "jogo analisado" : "jogos analisados"}`}
          </span>
        </div>
      </div>
    </section>
  )
}
