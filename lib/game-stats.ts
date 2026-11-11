import { getDayKeyInAppTimeZone } from "@/lib/format"
import type { GameView } from "@/lib/game-view"

export type GameSummary = {
  wins: number
  draws: number
  losses: number
  /** Mean of the account's accuracy over analysed games, or null if none were. */
  accuracyAverage: number | null
  analyzedCount: number
}

export function summarizeGames(games: readonly GameView[]): GameSummary {
  let wins = 0
  let draws = 0
  let losses = 0
  let accuracyTotal = 0
  let analyzedCount = 0

  for (const game of games) {
    if (game.result === "win") wins++
    else if (game.result === "draw") draws++
    else losses++

    if (game.accuracy) {
      accuracyTotal += game.accuracy.own
      analyzedCount++
    }
  }

  return {
    wins,
    draws,
    losses,
    accuracyAverage: analyzedCount > 0 ? accuracyTotal / analyzedCount : null,
    analyzedCount,
  }
}

export type RatingPoint = {
  endedAt: number
  rating: number
  /** Increments at every rating reset, so the line can break between runs. */
  runIndex: number
}

/**
 * One point per day (the day's last game, in the app time zone), oldest
 * first. Expects games in chronological order and from a single rating pool.
 */
export function buildRatingSeries(games: readonly GameView[]): RatingPoint[] {
  const points: RatingPoint[] = []
  let runIndex = 0
  let previousDayKey: string | null = null

  for (const game of games) {
    if (game.isRunStart) runIndex++
    const dayKey = getDayKeyInAppTimeZone(game.endedAt)
    const point = { endedAt: game.endedAt, rating: game.rating, runIndex }
    // Same day and same run: keep only the latest game of the day.
    const last = points.at(-1)
    if (dayKey === previousDayKey && last?.runIndex === runIndex) {
      points[points.length - 1] = point
    } else {
      points.push(point)
    }
    previousDayKey = dayKey
  }

  return points
}
