// Links every game to the GM Krikor episode that shows it and writes
// data/game-videos.json, which the app reads. Run it after new episodes come
// out and commit the result:
//
//   pnpm sync:videos                       summary per season
//   pnpm sync:videos --details             also lists unsure episodes and timestamps
//   pnpm sync:videos --refresh-timestamps  reads every episode's storyboard again
//
// Needs a YouTube Data API v3 key in .env or .env.local as YOUTUBE_API_KEY. A wrong
// match is fixed in data/game-video-overrides.json, which maps a game UUID to
// the video id that shows it, or to null for none.

import { readFile, writeFile } from "node:fs/promises"

import { ACCOUNTS, type AccountId } from "../lib/accounts.ts"
import { countMoves, readPgnHeader } from "../lib/pgn.ts"
import { isRunReset } from "../lib/rating-runs.ts"
import { formatEpisodeCode, formatVideoTime } from "../lib/youtube.ts"
import type { GameVideosFile, VideoEpisode } from "../types/game-videos.ts"
import { findGameStarts, replayOccupancy, type CandidateGame } from "./board-reading.mts"
import { readStoryboard } from "./storyboard.mts"
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

/** Games on each side of an episode's own, checked too, to report a misplaced game. */
const NEIGHBOR_GAMES = 3

const showDetails = process.argv.includes("--details")
const refreshTimestamps = process.argv.includes("--refresh-timestamps")

// YouTube ---------------------------------------------------------------------

type PlaylistItemsResponse = {
  nextPageToken?: string
  pageInfo: { totalResults: number }
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

type PlaylistItem = PlaylistItemsResponse["items"][number]

const UPLOAD_LISTING_ATTEMPTS = 3

/**
 * Every upload of the channel. Paging through a playlist this long sometimes
 * skips a page, which would drop a few dozen episodes from the file, so the
 * count is checked against the total YouTube reports.
 */
async function fetchUploads(): Promise<PlaylistItem[]> {
  // A channel's uploads playlist id is its channel id with "UU" for "UC".
  const playlistId = `UU${CHANNEL_ID.slice(2)}`
  for (let attempt = 1; ; attempt++) {
    const items = new Map<string, PlaylistItem>()
    let total = 0
    let pageToken: string | undefined
    do {
      const page = await getYouTube<PlaylistItemsResponse>("playlistItems", {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      })
      total = Math.max(total, page.pageInfo.totalResults)
      for (const item of page.items) items.set(item.contentDetails.videoId, item)
      pageToken = page.nextPageToken
    } while (pageToken)

    if (items.size >= total) return [...items.values()]
    const shortfall = `YouTube listed ${items.size} of ${total} uploads`
    if (attempt === UPLOAD_LISTING_ATTEMPTS) throw new Error(`${shortfall}, ${attempt} times. Try again later.`)
    console.warn(`${shortfall}, listing again`)
  }
}

/** Public episodes of every series, oldest first. */
async function fetchSeriesVideos(): Promise<Record<AccountId, SeriesVideo[]>> {
  const found: (Omit<SeriesVideo, "durationSeconds"> & { accountId: AccountId })[] = []
  const unknown: string[] = []

  for (const { snippet, contentDetails } of await fetchUploads()) {
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
  /** The moves, two characters each. See replayOccupancy. */
  tcn: string
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

type SyncGame = SeasonGame & { tcn: string; isWhite: boolean; opponent: string }

/** The account's games in its time class, split into runs, oldest first. Run n is season n. */
async function fetchRuns(accountId: AccountId): Promise<SyncGame[][]> {
  const account = ACCOUNTS.find(({ id }) => id === accountId)!
  const username = account.username.toLowerCase()
  const { archives } = await getChessCom<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${username}/games/archives`,
  )
  const games: SyncGame[] = []
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
        tcn: game.tcn,
        isWhite,
        opponent: (isWhite ? game.black : game.white).username,
      })
    }
  }
  games.sort((a, b) => a.endedAt - b.endedAt)

  const runs: SyncGame[][] = []
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

// Timestamps ------------------------------------------------------------------

/** Episodes from the last run, by video id, to reuse their timestamps. */
async function readPreviousEpisodes(): Promise<Map<string, VideoEpisode>> {
  try {
    const previous = JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as GameVideosFile
    return new Map(Object.values(previous).flat().map((episode) => [episode.videoId, episode]))
  } catch {
    return new Map()
  }
}

type StartSeconds = NonNullable<VideoEpisode["startSeconds"]>

/** The earlier result for the games still in the episode, or undefined when there is none. */
function keepEarlier(earlier: StartSeconds | undefined, shown: readonly SyncGame[]): StartSeconds | undefined {
  if (!earlier) return undefined
  const kept = shown.filter((game) => game.uuid in earlier).map((game) => [game.uuid, earlier[game.uuid]])
  return kept.length ? Object.fromEntries(kept) : undefined
}

/**
 * Seconds into the episode where each of its games starts, read from its
 * storyboard: null for a game the video doesn't show. Reuses the last run's
 * result while it covers every game of the episode. When the storyboard
 * can't be read, keeps whatever was read before and tries again next run;
 * the games without a time open the video from the start meanwhile.
 */
async function findStartSeconds(
  code: string,
  videoId: string,
  games: readonly SyncGame[],
  block: { first: number; end: number },
  previous: VideoEpisode | undefined,
): Promise<StartSeconds | undefined> {
  const shown = games.slice(block.first, block.end)
  const earlier = previous?.startSeconds
  if (!refreshTimestamps && earlier && shown.every((game) => game.uuid in earlier)) {
    return keepEarlier(earlier, shown)
  }

  let frames
  try {
    frames = await readStoryboard(videoId)
  } catch (error) {
    console.warn(`    ${code}: no timestamps, ${error instanceof Error ? error.message : error}`)
    return keepEarlier(earlier, shown)
  }
  const candidates: CandidateGame[] = games
    .slice(Math.max(0, block.first - NEIGHBOR_GAMES), block.end + NEIGHBOR_GAMES)
    .flatMap((game) => {
      const positions = replayOccupancy(game.tcn, game.isWhite)
      return positions ? [{ uuid: game.uuid, positions }] : []
    })
  const starts = findGameStarts(frames, candidates)

  // A game of the episode missing from the video, or a neighbour in it, means
  // the split is off there. Reported only: an override fixes it.
  const missing = shown.filter((game) => !starts.has(game.uuid))
  const strays = games.filter(
    (game, index) => (index < block.first || index >= block.end) && starts.has(game.uuid),
  )
  if (showDetails) {
    const found = shown.flatMap((game) =>
      starts.has(game.uuid) ? [`${formatVideoTime(starts.get(game.uuid)!)} ${game.opponent}`] : [],
    )
    console.log(`    ${code}  ${found.join(", ") || "no games found"}`)
  }
  if (missing.length) {
    console.warn(`    ${code}: not in the video: ${missing.map((game) => game.opponent).join(", ")}`)
  }
  if (strays.length) {
    console.warn(`    ${code}: in the video but not in the episode: ${strays.map((game) => game.opponent).join(", ")}`)
  }
  return Object.fromEntries(shown.map((game) => [game.uuid, starts.get(game.uuid) ?? null]))
}

// Main ------------------------------------------------------------------------

const overrides = JSON.parse(await readFile(OVERRIDES_PATH, "utf8")) as Record<string, string | null>
const previousEpisodes = await readPreviousEpisodes()
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

    let gamesTimed = 0
    let gamesLinked = 0
    for (const [index, video] of seasonVideos.entries()) {
      const match = matches[index]
      const shown = match.games ? games.slice(match.games.first, match.games.end) : []
      const code = formatEpisodeCode(season, video.episode)
      const startSeconds = match.games
        ? await findStartSeconds(code, video.videoId, games, match.games, previousEpisodes.get(video.videoId))
        : undefined
      // A game seen in the video is in the episode, whatever the split said.
      const isSure = (game: SyncGame, position: number) =>
        match.gameMargins[position] >= CONFIDENT_MARGIN || typeof startSeconds?.[game.uuid] === "number"
      if (showDetails && !shown.every(isSure)) {
        const marks = shown.map((game, position) => `${formatDate(game.startedAt)}${isSure(game, position) ? "" : "?"}`)
        console.log(`    ${code}  ${marks.join(", ") || "no games"}  "${video.title}"`)
      }
      gamesLinked += shown.length
      gamesTimed += Object.values(startSeconds ?? {}).filter((seconds) => seconds !== null).length
      entries.push({
        videoId: video.videoId,
        title: video.title,
        season,
        episode: video.episode,
        publishedAt: new Date(video.publishedAt * 1000).toISOString(),
        gameUuids: shown.filter(isSure).map((game) => game.uuid),
        uncertainGameUuids: shown.filter((game, position) => !isSure(game, position)).map((game) => game.uuid),
        ...(startSeconds ? { startSeconds } : {}),
      })
    }
    console.log(`        timestamps for ${gamesTimed} of ${gamesLinked} linked games`)
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
