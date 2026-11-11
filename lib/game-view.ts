import { getAccount, type AccountId } from "@/lib/accounts"
import { getYearInAppTimeZone } from "@/lib/format"
import type { ChessComGame } from "@/types/chess-com"

export type GameResult = "win" | "draw" | "loss"
export type PieceColor = "white" | "black"

/**
 * One game seen from the account's side. Built once on the server and sent to
 * the client, so it leaves out the PGN, which is 70% of the API payload.
 */
export type GameView = {
  uuid: string
  /** Chess.com game page, or null if the API sent anything else. */
  url: string | null
  /** Epoch milliseconds. */
  endedAt: number
  /** Calendar year in the app time zone, used by the year filter. */
  year: number
  result: GameResult
  /** Chess.com result code of the side that lost, or of either side on a draw. */
  termination: string
  color: PieceColor
  /** "chess", or a variant such as "chess960". Variants have their own ratings. */
  rules: string
  timeClass: string
  timeControl: string
  /** Account rating after this game. */
  rating: number
  /** Change since the previous game in the same rating pool (rules and time class). */
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

const CHESS_COM_URL_PREFIX = "https://www.chess.com/"
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

const GAME_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Chess.com game ids are UUIDs. Routes reject anything else before fetching. */
export function isGameUuid(value: string): boolean {
  return GAME_UUID_PATTERN.test(value)
}

/** "2026-11": the Chess.com monthly archive a game is filed under (UTC). */
export function toArchiveMonth(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

/** API strings end up in href attributes: only Chess.com pages pass. */
export function toSafeGameUrl(url: string): string | null {
  return url.startsWith(CHESS_COM_URL_PREFIX) ? url : null
}

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    // A stray "%" in the slug: keep it as it came.
    return slug
  }
}

export function parseOpeningName(ecoUrl: string | undefined): string | null {
  if (!ecoUrl?.startsWith(OPENINGS_URL_PREFIX)) return null
  const slug = decodeSlug(ecoUrl.slice(OPENINGS_URL_PREFIX.length))
  const movesIndex = slug.search(SLUG_MOVES_PATTERN)
  const nameSlug = movesIndex === -1 ? slug : slug.slice(0, movesIndex)
  const name = nameSlug.replace(/-/g, " ").trim()
  // Chess.com sends the literal slug "Undefined" when it found no opening.
  if (!name || name === "Undefined") return null
  return name
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
  rating: number,
  previousRating: number | undefined,
): Pick<GameView, "ratingDelta" | "isRunStart"> {
  if (previousRating === undefined) return { ratingDelta: null, isRunStart: false }

  // Only the size of the jump marks a reset. A sign that contradicts the
  // result is legitimate: a fair-play rating refund can land between games.
  const delta = rating - previousRating
  if (Math.abs(delta) > RUN_RESET_THRESHOLD) return { ratingDelta: null, isRunStart: true }
  return { ratingDelta: delta, isRunStart: false }
}

/** Each variant and time class has its own rating. */
function getRatingPool(game: ChessComGame): string {
  return `${game.rules}:${game.time_class}`
}

function toGameView(
  game: ChessComGame,
  username: string,
  previousRating: number | undefined,
): GameView {
  const isWhite = game.white.username.toLowerCase() === username
  const own = isWhite ? game.white : game.black
  const opponent = isWhite ? game.black : game.white
  const color: PieceColor = isWhite ? "white" : "black"
  const result = toGameResult(own.result)

  return {
    uuid: game.uuid,
    url: toSafeGameUrl(game.url),
    endedAt: game.end_time * 1000,
    year: getYearInAppTimeZone(game.end_time * 1000),
    result,
    termination: result === "win" ? opponent.result : own.result,
    color,
    rules: game.rules,
    timeClass: game.time_class,
    timeControl: game.time_control,
    rating: own.rating,
    ...computeRatingChange(own.rating, previousRating),
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
}

function getOwnRating(game: ChessComGame, username: string): number {
  return game.white.username.toLowerCase() === username ? game.white.rating : game.black.rating
}

/** Oldest game first. */
export function toGameViews(
  games: readonly ChessComGame[],
  accountId: AccountId,
): GameView[] {
  const username = getAccount(accountId).username.toLowerCase()
  const chronological = [...games].sort((a, b) => a.end_time - b.end_time)
  // A blitz game between two rapid games must not count as a rating jump.
  const lastRatingByPool = new Map<string, number>()

  return chronological.map((game) => {
    const pool = getRatingPool(game)
    const view = toGameView(game, username, lastRatingByPool.get(pool))
    lastRatingByPool.set(pool, view.rating)
    return view
  })
}

/**
 * One game's view, same result as picking it from toGameViews, without
 * deriving the rest of the history: only the previous game in its rating
 * pool matters. Null when the account has no such game.
 */
export function findGameView(
  games: readonly ChessComGame[],
  accountId: AccountId,
  uuid: string,
): GameView | null {
  const target = games.find((game) => game.uuid === uuid)
  if (!target) return null

  const username = getAccount(accountId).username.toLowerCase()
  const pool = getRatingPool(target)
  // Same stable sort as toGameViews, so ties resolve the same way.
  const poolGames = games
    .filter((game) => getRatingPool(game) === pool)
    .sort((a, b) => a.end_time - b.end_time)
  const previous = poolGames[poolGames.indexOf(target) - 1]

  return toGameView(target, username, previous ? getOwnRating(previous, username) : undefined)
}
