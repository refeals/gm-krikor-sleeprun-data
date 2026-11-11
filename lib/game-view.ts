import type { AccountId } from "@/lib/accounts"
import type { ChessComGame } from "@/types/chess-com"

export type GameResult = "win" | "draw" | "loss"
export type PieceColor = "white" | "black"

/**
 * One game seen from the account's side. Built once on the server and sent to
 * the client, so it leaves out the PGN, which is 70% of the API payload.
 */
export type GameView = {
  uuid: string
  url: string
  /** Epoch milliseconds. */
  endedAt: number
  result: GameResult
  /** Chess.com result code of the side that lost, or of either side on a draw. */
  termination: string
  color: PieceColor
  timeClass: string
  timeControl: string
  /** Account rating after this game. */
  rating: number
  /** Change since the previous game in the same time class. */
  ratingDelta: number | null
  /** The rating was reset before this game: a new speedrun started. */
  isRunStart: boolean
  opponent: { username: string; rating: number }
  accuracy: { own: number; opponent: number } | null
  openingName: string | null
  ecoCode: string | null
  moveCount: number
}

const DRAW_RESULT_CODES = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "50move",
  "timevsinsufficient",
])

// The largest legitimate single-game change seen in the data is +130, while
// still provisional. Resets are drops of about 2000 points.
const RUN_RESET_THRESHOLD = 300

const OPENINGS_URL_PREFIX = "https://www.chess.com/openings/"
// Opening slugs can end in the moves that reach the line:
// "Ruy-Lopez-Opening-Berlin-Defense-4.O-O", "Queens-Pawn-Opening-1...d5",
// "Sicilian-Defense-Smith-Morra-Gambit...3.Qxd4-Nc6".
const SLUG_MOVES_PATTERN = /(?:-|\.\.\.)\d+\./

export function toGameResult(resultCode: string): GameResult {
  if (resultCode === "win") return "win"
  if (DRAW_RESULT_CODES.has(resultCode)) return "draw"
  return "loss"
}

export function parseOpeningName(ecoUrl: string | undefined): string | null {
  if (!ecoUrl?.startsWith(OPENINGS_URL_PREFIX)) return null
  const slug = decodeURIComponent(ecoUrl.slice(OPENINGS_URL_PREFIX.length))
  const movesIndex = slug.search(SLUG_MOVES_PATTERN)
  const nameSlug = movesIndex === -1 ? slug : slug.slice(0, movesIndex)
  const name = nameSlug.replace(/-/g, " ").trim()
  return name || null
}

export function parseEcoCode(pgn: string): string | null {
  return pgn.match(/^\[ECO "([^"]+)"\]$/m)?.[1] ?? null
}

/** Highest move number in the PGN movetext. The FEN often lacks move counters. */
export function countMoves(pgn: string): number {
  const movetext = pgn
    .replace(/^\[.*\]\s*$/gm, "")
    .replace(/\{[^}]*\}/g, "")
  let highest = 0
  for (const match of movetext.matchAll(/(\d+)\./g)) {
    highest = Math.max(highest, Number(match[1]))
  }
  return highest
}

function computeRatingChange(
  result: GameResult,
  rating: number,
  previousRating: number | undefined,
): Pick<GameView, "ratingDelta" | "isRunStart"> {
  if (previousRating === undefined) return { ratingDelta: null, isRunStart: false }

  const delta = rating - previousRating
  const contradictsResult =
    (result === "win" && delta < 0) || (result === "loss" && delta > 0)
  if (contradictsResult || Math.abs(delta) > RUN_RESET_THRESHOLD) {
    return { ratingDelta: null, isRunStart: true }
  }
  return { ratingDelta: delta, isRunStart: false }
}

/** Oldest game first. */
export function toGameViews(
  games: readonly ChessComGame[],
  accountId: AccountId,
): GameView[] {
  const chronological = [...games].sort((a, b) => a.end_time - b.end_time)
  // Ratings are tracked per time class: a blitz game between two rapid games
  // has its own rating pool.
  const lastRatingByTimeClass = new Map<string, number>()

  return chronological.map((game) => {
    const isWhite = game.white.username.toLowerCase() === accountId
    const own = isWhite ? game.white : game.black
    const opponent = isWhite ? game.black : game.white
    const color: PieceColor = isWhite ? "white" : "black"
    const result = toGameResult(own.result)

    const previousRating = lastRatingByTimeClass.get(game.time_class)
    lastRatingByTimeClass.set(game.time_class, own.rating)

    return {
      uuid: game.uuid,
      url: game.url,
      endedAt: game.end_time * 1000,
      result,
      termination: result === "win" ? opponent.result : own.result,
      color,
      timeClass: game.time_class,
      timeControl: game.time_control,
      rating: own.rating,
      ...computeRatingChange(result, own.rating, previousRating),
      opponent: { username: opponent.username, rating: opponent.rating },
      accuracy: game.accuracies
        ? {
            own: game.accuracies[color],
            opponent: game.accuracies[isWhite ? "black" : "white"],
          }
        : null,
      openingName: parseOpeningName(game.eco),
      ecoCode: parseEcoCode(game.pgn),
      moveCount: countMoves(game.pgn),
    }
  })
}
