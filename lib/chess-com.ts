import "server-only"

import { cache } from "react"

import type { AccountId } from "@/lib/accounts"
import type {
  ChessComArchives,
  ChessComGame,
  ChessComMonth,
} from "@/types/chess-com"

const API_BASE_URL = "https://api.chess.com/pub/player"
const REQUEST_HEADERS = {
  "User-Agent": "sleeprun (+https://github.com/refeals/gm-krikor-sleeprun-data)",
}

// The archive list and the current month change during the day. Past months
// are effectively frozen; they still revalidate once a day so a month fetched
// in its last minutes, while it was current, eventually gets its final games.
const ARCHIVES_REVALIDATE_SECONDS = 300
const CURRENT_MONTH_REVALIDATE_SECONDS = 300
const PAST_MONTH_REVALIDATE_SECONDS = 86_400

// Chess.com rate-limits parallel requests, and an account has 40 to 70 months.
const MAX_CONCURRENT_REQUESTS = 6
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1_000

export class ChessComError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "ChessComError"
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function fetchJson<T>(url: string, revalidateSeconds: number): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      next: { revalidate: revalidateSeconds },
    })

    if (response.ok) return (await response.json()) as T

    const isRetryable = response.status === 429 || response.status >= 500
    if (!isRetryable || attempt >= MAX_ATTEMPTS) {
      throw new ChessComError(
        `Chess.com returned ${response.status} for ${url}`,
        response.status,
      )
    }
    await wait(RETRY_DELAY_MS * attempt)
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index])
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}

/** Archive URLs end in "/YYYY/MM", in UTC. */
function currentArchiveSuffix(now: Date) {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `/${now.getUTCFullYear()}/${month}`
}

/** Every game the account has played, oldest month first. Throws on failure. */
export const fetchAccountGames = cache(
  async (accountId: AccountId): Promise<ChessComGame[]> => {
    const { archives } = await fetchJson<ChessComArchives>(
      `${API_BASE_URL}/${accountId}/games/archives`,
      ARCHIVES_REVALIDATE_SECONDS,
    )

    const currentSuffix = currentArchiveSuffix(new Date())
    const months = await mapWithConcurrency(
      archives,
      MAX_CONCURRENT_REQUESTS,
      (archiveUrl) =>
        fetchJson<ChessComMonth>(
          archiveUrl,
          archiveUrl.endsWith(currentSuffix)
            ? CURRENT_MONTH_REVALIDATE_SECONDS
            : PAST_MONTH_REVALIDATE_SECONDS,
        ),
    )

    return months.flatMap((month) => month.games)
  },
)
