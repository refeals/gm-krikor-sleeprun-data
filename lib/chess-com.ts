import "server-only"

import { cache } from "react"

import { getAccount, type AccountId } from "@/lib/accounts"
import type {
  ChessComArchives,
  ChessComGame,
  ChessComMonth,
} from "@/types/chess-com"

const API_BASE_URL = "https://api.chess.com/pub/player"
const REQUEST_HEADERS = {
  "User-Agent": "sleeprun (+https://sleeprun.vercel.app)",
}

// The archive list and recent months change during the day. Older months are
// effectively frozen and revalidate once a day.
//
// Next.js judges an entry's freshness by the revalidate of the call reading
// it, not the one that stored it. On the first day of a month, the month that
// just closed may have been stored hours before it ended, so it keeps the
// short lifetime until its final games are in.
const RECENT_REVALIDATE_SECONDS = 300
const PAST_MONTH_REVALIDATE_SECONDS = 86_400

// Chess.com rate-limits parallel requests, and an account has 40 to 70 months.
const MAX_CONCURRENT_REQUESTS = 6
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1_000
const REQUEST_TIMEOUT_MS = 15_000

export class ChessComError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChessComError"
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function fetchJson<T>(url: string, revalidateSeconds: number): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const isLastAttempt = attempt >= MAX_ATTEMPTS
    let failure: string
    try {
      const response = await fetch(url, {
        headers: REQUEST_HEADERS,
        next: { revalidate: revalidateSeconds },
        // A signal per attempt also opts out of Next's per-render fetch
        // dedupe, which would otherwise replay the first failed response.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      // Reading the body is inside the try: a timeout while streaming it, or
      // an HTML maintenance page served with 200, is retried too.
      if (response.ok) return (await response.json()) as T

      const isRetryable = response.status === 429 || response.status >= 500
      if (!isRetryable) throw new ChessComError(`Chess.com returned ${response.status} for ${url}`)
      failure = `status ${response.status}`
    } catch (error) {
      if (error instanceof ChessComError) throw error
      failure = String(error)
    }

    if (isLastAttempt) throw new ChessComError(`Chess.com request failed for ${url}: ${failure}`)
    await wait(RETRY_DELAY_MS * attempt)
  }
}

/** Like Promise.all over a mapper, with a concurrency cap. Stops starting work after a failure. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  let hasFailed = false

  async function worker() {
    while (!hasFailed && nextIndex < items.length) {
      const index = nextIndex++
      try {
        results[index] = await mapper(items[index])
      } catch (error) {
        hasFailed = true
        throw error
      }
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}

/** Archive URLs end in "/YYYY/MM", in UTC. */
function toArchiveSuffix(year: number, monthIndex: number) {
  return `/${year}/${String(monthIndex + 1).padStart(2, "0")}`
}

/** Suffixes of the months that may still change: the current one, plus the previous one on day 1. */
function getRecentArchiveSuffixes(now: Date): string[] {
  const year = now.getUTCFullYear()
  const monthIndex = now.getUTCMonth()
  const suffixes = [toArchiveSuffix(year, monthIndex)]
  if (now.getUTCDate() === 1) {
    const previous = new Date(Date.UTC(year, monthIndex - 1, 1))
    suffixes.push(toArchiveSuffix(previous.getUTCFullYear(), previous.getUTCMonth()))
  }
  return suffixes
}

function getArchiveRevalidateSeconds(archiveUrl: string, recentSuffixes: readonly string[]) {
  return recentSuffixes.some((suffix) => archiveUrl.endsWith(suffix))
    ? RECENT_REVALIDATE_SECONDS
    : PAST_MONTH_REVALIDATE_SECONDS
}

function getArchivesUrl(accountId: AccountId) {
  return `${API_BASE_URL}/${getAccount(accountId).username.toLowerCase()}/games/archives`
}

/** Archive URLs of every month with games, oldest first. */
const fetchArchiveUrls = cache(async (accountId: AccountId): Promise<string[]> => {
  const { archives } = await fetchJson<ChessComArchives>(
    getArchivesUrl(accountId),
    RECENT_REVALIDATE_SECONDS,
  )
  return archives
})

/** Every game the account has played, oldest month first. Throws on failure. */
export const fetchAccountGames = cache(
  async (accountId: AccountId): Promise<ChessComGame[]> => {
    const archives = await fetchArchiveUrls(accountId)
    const recentSuffixes = getRecentArchiveSuffixes(new Date())
    const months = await mapWithConcurrency(
      archives,
      MAX_CONCURRENT_REQUESTS,
      (archiveUrl) =>
        fetchJson<ChessComMonth>(archiveUrl, getArchiveRevalidateSeconds(archiveUrl, recentSuffixes)),
    )

    return months.flatMap((month) => month.games)
  },
)

const ARCHIVE_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

/**
 * One game, raw. A month hint ("2026-11") reads only that month's archive,
 * and only if the account has one for that month: arbitrary months never
 * reach Chess.com. Without a usable hint, or if the game isn't there (or the
 * month fails), it searches the whole history.
 */
export async function findAccountGame(
  accountId: AccountId,
  uuid: string,
  monthHint: string | null,
): Promise<ChessComGame | null> {
  const hint = monthHint?.match(ARCHIVE_MONTH_PATTERN)
  if (hint) {
    const archives = await fetchArchiveUrls(accountId)
    const archiveUrl = archives.find((url) => url.endsWith(`/${hint[1]}/${hint[2]}`))
    if (archiveUrl) {
      try {
        const month = await fetchJson<ChessComMonth>(
          archiveUrl,
          getArchiveRevalidateSeconds(archiveUrl, getRecentArchiveSuffixes(new Date())),
        )
        const game = month.games.find((candidate) => candidate.uuid === uuid)
        if (game) return game
      } catch (error) {
        // The full history below is the fallback; anything else is a bug.
        if (!(error instanceof ChessComError)) throw error
      }
    }
  }

  const games = await fetchAccountGames(accountId)
  return games.find((candidate) => candidate.uuid === uuid) ?? null
}
