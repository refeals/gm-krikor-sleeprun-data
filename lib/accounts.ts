// Each account plays a single format, so the format label is a constant
// instead of being read from the games. Keeping it here lets the header render
// while games are still loading or when Chess.com is down.
export const ACCOUNTS = [
  {
    id: "sleeprerun",
    label: "SleepRun",
    username: "SleepReRun",
    /** The account's series on GM Krikor's YouTube channel. */
    seriesName: "SleepRun",
    timeClass: "rapid",
    timeControlLabel: "Rápida 10+0",
  },
  {
    id: "speedbemruim",
    label: "SpeedBemRuim",
    username: "SpeedBemRuim",
    seriesName: "SpeedRuim",
    timeClass: "blitz",
    timeControlLabel: "Blitz 3+0",
  },
] as const

export type Account = (typeof ACCOUNTS)[number]
export type AccountId = Account["id"]

export const DEFAULT_ACCOUNT_ID: AccountId = "sleeprerun"

export function isAccountId(value: string): value is AccountId {
  return ACCOUNTS.some((account) => account.id === value)
}

/** The account's game archive on Chess.com. Accepts any route value. */
export function getChessComArchiveUrl(accountParam: string): string {
  const username = isAccountId(accountParam) ? getAccount(accountParam).username : accountParam
  return `https://www.chess.com/games/archive/${encodeURIComponent(username.toLowerCase())}`
}

export function getAccount(id: AccountId): Account {
  const account = ACCOUNTS.find((candidate) => candidate.id === id)
  if (!account) throw new Error(`Unknown account: ${id}`)
  return account
}
