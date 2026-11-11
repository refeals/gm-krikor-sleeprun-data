// Lists opening families missing from the Portuguese dictionary (they show
// and search in English), using every game currently on Chess.com for both
// accounts. Also prints a sample of translations to review.
//
//   pnpm check:openings
//
// Add what it reports to NAMED_OPENINGS in lib/openings.ts.

import { ACCOUNTS } from "../lib/accounts.ts"
import { guessOpeningFamily, hasKnownOpeningFamily, parseOpeningName, translateOpeningName } from "../lib/openings.ts"

type Game = { eco?: string }

const HEADERS = { "User-Agent": "sleeprun (+https://sleeprun.vercel.app)" }

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: HEADERS })
  if (!response.ok) throw new Error(`Chess.com returned ${response.status} for ${url}`)
  return (await response.json()) as T
}

const names: string[] = []
for (const account of ACCOUNTS) {
  const { archives } = await getJson<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${account.username.toLowerCase()}/games/archives`,
  )
  // One month at a time: Chess.com rate-limits parallel requests.
  for (const archive of archives) {
    const { games } = await getJson<{ games: Game[] }>(archive)
    for (const game of games) {
      const name = parseOpeningName(game.eco)
      if (name) names.push(name)
    }
  }
  console.log(`${account.username}: ${archives.length} months read`)
}

const unknown = new Map<string, { count: number; example: string }>()
for (const name of names) {
  if (hasKnownOpeningFamily(name)) continue
  const family = guessOpeningFamily(name)
  const entry = unknown.get(family) ?? { count: 0, example: name }
  entry.count++
  unknown.set(family, entry)
}

const unknownGames = [...unknown.values()].reduce((sum, entry) => sum + entry.count, 0)
const coverage = (((names.length - unknownGames) / names.length) * 100).toFixed(1)
console.log(`\n${names.length} games with an opening; ${coverage}% are translated to Portuguese.`)

if (unknown.size === 0) {
  console.log("Every family is in the dictionary.")
} else {
  console.log(`\n${unknown.size} families missing from NAMED_OPENINGS:`)
  for (const [family, { count, example }] of [...unknown].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${family} (${count} games), e.g. "${example}"`)
  }
}

const frequent = new Map<string, number>()
for (const name of names) frequent.set(name, (frequent.get(name) ?? 0) + 1)
console.log("\nMost common openings:")
for (const [name, count] of [...frequent].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(count).padStart(4)}  ${translateOpeningName(name)}  (${name})`)
}
