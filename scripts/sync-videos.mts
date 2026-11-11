// Links every game to the GM Krikor episode that shows it and writes
// data/game-videos.json, which the app reads. Run it after new episodes come
// out and commit the result:
//
//   pnpm sync:videos            summary per season
//   pnpm sync:videos --details  also lists the episodes it is unsure about
//
// Needs a YouTube Data API v3 key in .env or .env.local as YOUTUBE_API_KEY. A wrong
// match is fixed in data/game-video-overrides.json, which maps a game UUID to
// the video id that shows it, or to null for none.

import { readFile, writeFile } from "node:fs/promises"

import { ACCOUNTS, type AccountId } from "../lib/accounts.ts"
import { countMoves, readPgnHeader } from "../lib/pgn.ts"
import { isRunReset } from "../lib/rating-runs.ts"
import { formatEpisodeCode } from "../lib/youtube.ts"
import type { GameVideosFile, VideoEpisode } from "../types/game-videos.ts"
import {
  alignSeason,
  matchesTitle,
  parseTitleHints,
  type EpisodeMatch,
  type SeasonEpisode,
  type SeasonGame,
} from "./video-alignment.mts"

const CHANNEL_ID = "UCwWm-fABiYbcL7ro8qONd6Q"
const OUTPUT_PATH = new URL("../data/game-videos.json", import.meta.url)
const OVERRIDES_PATH = new URL("../data/game-video-overrides.json", import.meta.url)

/** How each account's series is spelled in titles, which end in a code such as "SleepRun S07E045". */
const SERIES_PATTERNS: Record<AccountId, RegExp> = {
  sleeprerun: /sleep\s*(?:re)?run/gi,
  speedbemruim: /speed\s*(?:ruim|bad)\b/gi,
}
const EPISODE_CODE_PATTERN = /S\s*(\d{1,2})\s*E\s*(\d{1,3})/i

// Series titles without a code, or with a wrong one. Null leaves the video out.
const TITLE_FIXES: Record<string, { season: number; episode: number | null } | null> = {
  eObxrWhgEO0: { season: 5, episode: 159 }, // "SleepRerun #159"
  Uk9U1itCFUI: { season: 5, episode: 160 }, // "SleepRerun episódio final."
  CXLoeL1XiN8: { season: 2, episode: 187 }, // "SleepRerun #187", out between S02E186 and S02E187
  a7PjlGYcOuM: { season: 2, episode: null }, // "SleepRerun ep BÔNUS", after S02E192
  "7Mm0IqsZSlw": { season: 2, episode: 52 }, // "Speedruim #52"
  "15VLnulno8k": { season: 2, episode: 61 }, // "SpeedRuim #61"
  rh22ePNgcz4: { season: 4, episode: 48 }, // "Speedruim S04E348"
  gxxwyxCP3DA: { season: 5, episode: 35 }, // "SpeedRuim Final", after S05E34
  // "Speedruim tá de volta?": out in April 2021, when the account had no games.
  KZ3PL4efaHE: null,
}

/** Below this margin, another episode fit a game almost as well. */
const CONFIDENT_MARGIN = 2

const showDetails = process.argv.includes("--details")

// YouTube ---------------------------------------------------------------------

type PlaylistItemsResponse = {
  nextPageToken?: string
  items: {
    snippet: { title: string }
    contentDetails: { videoId: string; videoPublishedAt?: string }
  }[]
}

type VideosResponse = {
  items: { id: string; contentDetails: { duration: string } }[]
}

type SeriesVideo = {
  videoId: string
  title: string
  season: number
  episode: number | null
  /** Epoch seconds. */
  publishedAt: number
  durationSeconds: number
}

const apiKey = process.env.YOUTUBE_API_KEY
if (!apiKey) {
  console.error("Missing YOUTUBE_API_KEY. Add a YouTube Data API v3 key to .env or .env.local.")
  process.exit(1)
}

async function getYouTube<T>(resource: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  url.searchParams.set("key", apiKey!)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`YouTube returned ${response.status} for ${resource}: ${await response.text()}`)
  }
  return (await response.json()) as T
}

/** "PT1H2M3S" in seconds. */
function parseIsoDuration(duration: string): number {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!match) throw new Error(`Unexpected video duration: ${duration}`)
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0))
  return ((days * 24 + hours) * 60 + minutes) * 60 + seconds
}

/**
 * The account whose series the title names last, next to the episode code:
 * "Speedruim voltou? - SleepRun S01E31" is a SleepRun episode. `at` is where
 * that name starts.
 */
function findSeries(title: string): { accountId: AccountId; at: number } | null {
  let found: { accountId: AccountId; at: number } | null = null
  for (const { id } of ACCOUNTS) {
    for (const match of title.matchAll(SERIES_PATTERNS[id])) {
      if (!found || match.index > found.at) found = { accountId: id, at: match.index }
    }
  }
  return found
}

/** The title without its "- SleepRun S07E045" ending, which the app shows on its own. */
function stripSeriesSuffix(title: string, seriesAt: number): string {
  const stripped = title.slice(0, seriesAt).replace(/[\s\-–|:]+$/, "")
  return stripped || title.trim()
}

/** Season and episode from the title, or from TITLE_FIXES. Undefined when unknown. */
function readEpisodeCode(videoId: string, title: string) {
  if (videoId in TITLE_FIXES) return TITLE_FIXES[videoId]
  const code = title.match(EPISODE_CODE_PATTERN)
  return code ? { season: Number(code[1]), episode: Number(code[2]) } : undefined
}

/** Public episodes of every series, oldest first. */
async function fetchSeriesVideos(): Promise<Record<AccountId, SeriesVideo[]>> {
  // A channel's uploads playlist id is its channel id with "UU" for "UC".
  const playlistId = `UU${CHANNEL_ID.slice(2)}`
  const found: (Omit<SeriesVideo, "durationSeconds"> & { accountId: AccountId })[] = []
  const unknown: string[] = []

  let pageToken: string | undefined
  do {
    const page = await getYouTube<PlaylistItemsResponse>("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    })
    for (const { snippet, contentDetails } of page.items) {
      // Private and deleted videos have no publish date.
      if (!contentDetails.videoPublishedAt) continue
      const series = findSeries(snippet.title)
      if (!series) continue
      const code = readEpisodeCode(contentDetails.videoId, snippet.title)
      if (code === null) continue
      if (code === undefined) {
        unknown.push(`${contentDetails.videoId}  ${snippet.title}`)
        continue
      }
      found.push({
        accountId: series.accountId,
        videoId: contentDetails.videoId,
        title: stripSeriesSuffix(snippet.title, series.at),
        ...code,
        publishedAt: Date.parse(contentDetails.videoPublishedAt) / 1000,
      })
    }
    pageToken = page.nextPageToken
  } while (pageToken)

  if (unknown.length) {
    console.warn(`\nSeries videos without an episode code, left out (add them to TITLE_FIXES):`)
    for (const line of unknown) console.warn(`  ${line}`)
  }

  const durations = new Map<string, number>()
  for (let index = 0; index < found.length; index += 50) {
    const ids = found.slice(index, index + 50).map((video) => video.videoId)
    const { items } = await getYouTube<VideosResponse>("videos", { part: "contentDetails", id: ids.join(",") })
    for (const item of items) durations.set(item.id, parseIsoDuration(item.contentDetails.duration))
  }

  const byAccount = Object.fromEntries(ACCOUNTS.map(({ id }) => [id, [] as SeriesVideo[]])) as Record<
    AccountId,
    SeriesVideo[]
  >
  for (const { accountId, ...video } of found) {
    const durationSeconds = durations.get(video.videoId)
    if (durationSeconds) byAccount[accountId].push({ ...video, durationSeconds })
  }
  for (const videos of Object.values(byAccount)) videos.sort((a, b) => a.publishedAt - b.publishedAt)
  return byAccount
}

// Chess.com -------------------------------------------------------------------

type ChessComPlayer = { username: string; rating: number }
type ChessComGame = {
  uuid: string
  pgn: string
  end_time: number
  rules: string
  time_class: string
  time_control: string
  white: ChessComPlayer
  black: ChessComPlayer
}

const CHESS_COM_HEADERS = { "User-Agent": "sleeprun (+https://sleeprun.vercel.app)" }

async function getChessCom<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: CHESS_COM_HEADERS })
    if (response.ok) return (await response.json()) as T
    if (attempt === 3 || (response.status !== 429 && response.status < 500)) {
      throw new Error(`Chess.com returned ${response.status} for ${url}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt))
  }
}

/** Epoch seconds the game started, from its PGN; falls back to its base time before the end. */
function readStartTime(game: ChessComGame): number {
  const date = readPgnHeader(game.pgn, "UTCDate")
  const time = readPgnHeader(game.pgn, "UTCTime")
  const started = date && time ? Date.parse(`${date.replaceAll(".", "-")}T${time}Z`) / 1000 : NaN
  if (Number.isFinite(started) && started <= game.end_time) return started
  return game.end_time - Number.parseInt(game.time_control, 10)
}

/** The account's games in its time class, split into runs, oldest first. Run n is season n. */
async function fetchRuns(accountId: AccountId): Promise<SeasonGame[][]> {
  const account = ACCOUNTS.find(({ id }) => id === accountId)!
  const username = account.username.toLowerCase()
  const { archives } = await getChessCom<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${username}/games/archives`,
  )
  const games: SeasonGame[] = []
  // One month at a time: Chess.com rate-limits parallel requests.
  for (const archive of archives) {
    const month = await getChessCom<{ games: ChessComGame[] }>(archive)
    for (const game of month.games) {
      if (game.rules !== "chess" || game.time_class !== account.timeClass) continue
      const isWhite = game.white.username.toLowerCase() === username
      games.push({
        uuid: game.uuid,
        startedAt: readStartTime(game),
        endedAt: game.end_time,
        ownRating: (isWhite ? game.white : game.black).rating,
        opponentRating: (isWhite ? game.black : game.white).rating,
        moveCount: countMoves(game.pgn),
      })
    }
  }
  games.sort((a, b) => a.endedAt - b.endedAt)

  const runs: SeasonGame[][] = []
  for (const [index, game] of games.entries()) {
    const previous = games[index - 1]
    if (!previous || isRunReset(previous.ownRating, game.ownRating)) runs.push([])
    runs[runs.length - 1].push(game)
  }
  return runs
}

// Report ----------------------------------------------------------------------

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 16).replace("T", " ")
}

/**
 * Episodes whose title mentions a rating or move count, and how many of them
 * got a game with it. Run on a split made without titles, it measures how
 * often the rest of the model is right.
 */
function countTitleAgreement(
  games: readonly SeasonGame[],
  episodes: readonly SeasonEpisode[],
  matches: readonly EpisodeMatch[],
) {
  let checked = 0
  let agreeing = 0
  for (const [index, episode] of episodes.entries()) {
    const hints = parseTitleHints(episode.title)
    if (!hints.ratings.length && !hints.moveCounts.length) continue
    checked++
    const block = matches[index].games
    if (block && games.slice(block.first, block.end).some((game) => matchesTitle(game, hints))) agreeing++
  }
  return { checked, agreeing }
}

// Main ------------------------------------------------------------------------

const overrides = JSON.parse(await readFile(OVERRIDES_PATH, "utf8")) as Record<string, string | null>
const videosByAccount = await fetchSeriesVideos()
const output = {} as GameVideosFile

for (const account of ACCOUNTS) {
  const videos = videosByAccount[account.id]
  const runs = await fetchRuns(account.id)
  const seasons = [...new Set(videos.map((video) => video.season))].sort((a, b) => a - b)
  const lastSeason = Math.max(...seasons)
  console.log(`\n${account.seriesName} (${account.username}): ${videos.length} episodes, ${runs.length} runs on Chess.com`)

  const entries: VideoEpisode[] = []
  for (const season of seasons) {
    const seasonVideos = videos.filter((video) => video.season === season)
    const games = runs[season - 1]
    if (!games) {
      console.warn(`  S${season}: no run ${season} on Chess.com, left out`)
      continue
    }
    const episodes: SeasonEpisode[] = seasonVideos
    const isOngoing = season === lastSeason && season === runs.length
    const matches = alignSeason(games, episodes, { isOngoing })
    const blind = alignSeason(games, episodes, { isOngoing, ignoreTitles: true })

    const margins = matches.flatMap((match) => match.gameMargins)
    const unsure = margins.filter((margin) => margin < CONFIDENT_MARGIN).length
    const empty = matches.filter((match) => !match.games).length
    const titles = countTitleAgreement(games, episodes, blind)
    console.log(
      `  S${String(season).padStart(2, "0")}  ${String(episodes.length).padStart(3)} episodes  ` +
        `${String(games.length).padStart(3)} games  ${String(margins.length).padStart(3)} linked ` +
        `(${String(unsure).padStart(3)} unsure)  ${String(empty).padStart(2)} empty episodes  ` +
        `titles agree ${titles.agreeing}/${titles.checked} without using them`,
    )

    for (const [index, video] of seasonVideos.entries()) {
      const match = matches[index]
      const shown = match.games ? games.slice(match.games.first, match.games.end) : []
      const isSure = (position: number) => match.gameMargins[position] >= CONFIDENT_MARGIN
      if (showDetails && !shown.every((_, position) => isSure(position))) {
        const marks = shown.map((game, position) => `${formatDate(game.startedAt)}${isSure(position) ? "" : "?"}`)
        console.log(`    ${formatEpisodeCode(season, video.episode)}  ${marks.join(", ") || "no games"}  "${video.title}"`)
      }
      entries.push({
        videoId: video.videoId,
        title: video.title,
        season,
        episode: video.episode,
        publishedAt: new Date(video.publishedAt * 1000).toISOString(),
        gameUuids: shown.filter((_, position) => isSure(position)).map((game) => game.uuid),
        uncertainGameUuids: shown.filter((_, position) => !isSure(position)).map((game) => game.uuid),
      })
    }
  }
  output[account.id] = entries
}

// Overrides win over the alignment.
const allEntries = Object.values(output).flat()
for (const [gameUuid, videoId] of Object.entries(overrides)) {
  for (const entry of allEntries) {
    entry.gameUuids = entry.gameUuids.filter((uuid) => uuid !== gameUuid)
    entry.uncertainGameUuids = entry.uncertainGameUuids.filter((uuid) => uuid !== gameUuid)
  }
  if (videoId === null) continue
  const target = allEntries.find((entry) => entry.videoId === videoId)
  if (target) target.gameUuids.push(gameUuid)
  else console.warn(`Override for ${gameUuid}: video ${videoId} is not a known episode`)
}

// One episode per line keeps the file small and its diffs readable.
const json = Object.entries(output)
  .map(([accountId, entries]) => `  "${accountId}": [\n${entries.map((entry) => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]`)
  .join(",\n")
await writeFile(OUTPUT_PATH, `{\n${json}\n}\n`)
console.log(`\nWrote ${OUTPUT_PATH.pathname}`)
