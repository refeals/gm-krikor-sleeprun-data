// Splits a season's games among its episodes. Nobody records which games an
// episode shows, but three facts narrow it down:
//
// - an episode shows consecutive games, and episodes follow the order the
//   games were played in;
// - an episode is published after its last game ends;
// - an episode's length follows the time spent playing its games.
//
// Gaps between games add a fourth: one episode rarely spans two sittings.
// Titles sometimes name a rating or a move count ("O 1300 levou um mate",
// "perder em 4 lances"), which pins an episode to a game.
//
// Dynamic programming finds the split with the lowest total cost. The costs
// are rough weights, tuned on the seasons up to November 2026.

export type SeasonGame = {
  uuid: string
  /** Epoch seconds. */
  startedAt: number
  /** Epoch seconds. */
  endedAt: number
  ownRating: number
  opponentRating: number
  moveCount: number
}

export type SeasonEpisode = {
  title: string
  /** Epoch seconds. */
  publishedAt: number
  durationSeconds: number
}

export type EpisodeMatch = {
  /** Games [first, end) of the season, or null when no game fits the episode. */
  games: { first: number; end: number } | null
  /**
   * For each of those games, the extra cost of the best split that puts it
   * elsewhere. Small means another episode is nearly as likely.
   */
  gameMargins: number[]
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const MAX_GAMES_PER_EPISODE = 40
/** Editing and uploading take at least this long after the last game. */
const MIN_PUBLISH_DELAY = 30 * MINUTE

/** A game in no episode: an unfinished or unremarkable game left out of the video. */
const SKIPPED_GAME_COST = 3
/** An episode without games: a bonus or a recap. */
const EMPTY_EPISODE_COST = 8
const DURATION_WEIGHT = 3
const TITLE_HINT_BONUS = 4
/** Video seconds per second played, before the first pass measures it. */
const INITIAL_DURATION_RATIO = 1.5
/** Episodes on each side used to measure the local duration ratio. */
const DURATION_RATIO_WINDOW = 10

/** Keeping two games in one episode costs more the longer the break between them. */
function joinCost(gapSeconds: number): number {
  if (gapSeconds <= 10 * MINUTE) return 0
  if (gapSeconds <= 2 * HOUR) return (4 * (gapSeconds - 10 * MINUTE)) / (110 * MINUTE)
  return 10
}

/** A break this long between games ends a sitting. */
const SITTING_BREAK = 30 * MINUTE

/** Ending an episode in the middle of a sitting is common, but less so than at a break. */
function splitCost(gapSeconds: number): number {
  return gapSeconds >= SITTING_BREAK ? 0 : 1
}

/** Episodes usually come out within weeks of being recorded. */
function delayCost(delaySeconds: number): number {
  return delaySeconds <= 45 * DAY ? 0 : (delaySeconds - 45 * DAY) / (30 * DAY)
}

type TitleHints = { ratings: number[]; moveCounts: number[] }

const RATING_PATTERN = /(?<![\d.,/])(\d{3,4})(?![\d%])(?!\s*(?:pontos|partidas|jogos|gambitos|vit[oó]rias|lances))/gi
// Only a game that ended: "ficou perdido em 4 lances" counts the moves to a
// blunder, not the length of the game.
const MOVE_COUNT_PATTERN =
  /\b(?:mate|abandon\w*|venc\w*|ganh\w*|derrot\w*|perder|perdeu|perdi)\b[^\d]{0,25}?\bem\s+(\d{1,2})\s+lances\b/gi

/** Ratings and move counts a title mentions, e.g. "O 1300 levou mate em 8 lances". */
export function parseTitleHints(title: string): TitleHints {
  const text = title.replace(/S\s*\d{1,2}\s*E\s*\d{1,3}/gi, "").replace(/#\d+/g, "")
  const ratings = [...text.matchAll(RATING_PATTERN)]
    .map((match) => Number(match[1]))
    // Years are more likely than ratings in that range.
    .filter((value) => value >= 100 && value <= 3400 && (value < 2019 || value > 2030))
  const moveCounts = [...text.matchAll(MOVE_COUNT_PATTERN)].map((match) => Number(match[1]))
  return { ratings, moveCounts }
}

/** "1300" means the 1300s, give or take a rounded 1260; "2309" means about 2309. */
function matchesRating(rating: number, mentioned: number): boolean {
  return mentioned % 100 === 0
    ? rating >= mentioned - 50 && rating < mentioned + 100
    : Math.abs(rating - mentioned) <= 10
}

function matchesHint(game: SeasonGame, hints: TitleHints, kind: "rating" | "moves"): boolean {
  if (kind === "rating") {
    return hints.ratings.some(
      (mentioned) => matchesRating(game.ownRating, mentioned) || matchesRating(game.opponentRating, mentioned),
    )
  }
  return hints.moveCounts.some((count) => Math.abs(game.moveCount - count) <= 1)
}

/** The game has a rating or move count the title mentions. */
export function matchesTitle(game: SeasonGame, hints: TitleHints): boolean {
  return matchesHint(game, hints, "rating") || matchesHint(game, hints, "moves")
}

/** prefix[k] = sum of values[0..k-1]. */
function prefixSums(values: readonly number[]): Float64Array {
  const sums = new Float64Array(values.length + 1)
  for (let index = 0; index < values.length; index++) sums[index + 1] = sums[index] + values[index]
  return sums
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

type Options = {
  /** The season is still being published: its latest games may not be in an episode yet. */
  isOngoing: boolean
  /** Turns off title hints, to measure how often the rest of the model agrees with them. */
  ignoreTitles?: boolean
}

/** Games are sorted by end time and episodes by publish time. */
export function alignSeason(
  games: readonly SeasonGame[],
  episodes: readonly SeasonEpisode[],
  options: Options,
): EpisodeMatch[] {
  let ratios = episodes.map(() => INITIAL_DURATION_RATIO)
  const firstPass = solve(games, episodes, ratios, options)

  // Commentary grows as the opponents get stronger, so the ratio drifts
  // through a season. Measure it around each episode, then solve again.
  const measured = firstPass.map((match, index) => {
    if (!match.games) return null
    const played = playedSeconds(games, match.games.first, match.games.end)
    return episodes[index].durationSeconds / played
  })
  ratios = episodes.map((_, index) => {
    const window = measured.slice(
      Math.max(0, index - DURATION_RATIO_WINDOW),
      index + DURATION_RATIO_WINDOW + 1,
    )
    return median(window.filter((ratio): ratio is number => ratio !== null)) ?? INITIAL_DURATION_RATIO
  })
  return solve(games, episodes, ratios, options)
}

function playedSeconds(games: readonly SeasonGame[], first: number, end: number): number {
  let total = 0
  for (let index = first; index < end; index++) total += games[index].endedAt - games[index].startedAt
  // A game that ends in seconds still takes a minute of video.
  return Math.max(total, MINUTE)
}

function solve(
  games: readonly SeasonGame[],
  episodes: readonly SeasonEpisode[],
  durationRatios: readonly number[],
  { isOngoing, ignoreTitles = false }: Options,
): EpisodeMatch[] {
  const gameCount = games.length
  const episodeCount = episodes.length
  const lastPublishedAt = Math.max(...episodes.map((episode) => episode.publishedAt))

  // Games played after the last episode came out can't be in one yet.
  const skipPrefix = prefixSums(
    games.map((game) => (game.endedAt > lastPublishedAt - MIN_PUBLISH_DELAY ? 0 : SKIPPED_GAME_COST)),
  )
  // joinPrefix[k] sums the join costs of the pairs (0,1) .. (k-1,k).
  const joinPrefix = prefixSums(
    games.slice(1).map((game, index) => joinCost(game.startedAt - games[index].endedAt)),
  )
  const playedPrefix = prefixSums(games.map((game) => game.endedAt - game.startedAt))

  // hintPrefix[e][kind][k]: games before k that match episode e's title.
  const hintPrefixes = episodes.map((episode) => {
    const hints = ignoreTitles ? { ratings: [], moveCounts: [] } : parseTitleHints(episode.title)
    return {
      rating: hints.ratings.length ? prefixSums(games.map((game) => Number(matchesHint(game, hints, "rating")))) : null,
      moves: hints.moveCounts.length ? prefixSums(games.map((game) => Number(matchesHint(game, hints, "moves")))) : null,
    }
  })

  // lastEnd[e]: the most games that can have ended before episode e came out.
  const lastEnd = episodes.map((episode) => {
    let end = 0
    while (end < gameCount && games[end].endedAt <= episode.publishedAt - MIN_PUBLISH_DELAY) end++
    return end
  })

  /** Cost of episode e showing games [first, end). */
  function blockCost(e: number, first: number, end: number): number {
    if (end > lastEnd[e]) return Infinity
    const episode = episodes[e]
    let cost = joinPrefix[end - 1] - joinPrefix[first]
    if (first > 0) cost += splitCost(games[first].startedAt - games[first - 1].endedAt)

    const played = Math.max(playedPrefix[end] - playedPrefix[first], MINUTE)
    cost += DURATION_WEIGHT * Math.abs(Math.log(episode.durationSeconds / (played * durationRatios[e])))
    cost += delayCost(episode.publishedAt - games[end - 1].endedAt)

    const hints = hintPrefixes[e]
    if (hints.rating && hints.rating[end] > hints.rating[first]) cost -= TITLE_HINT_BONUS
    if (hints.moves && hints.moves[end] > hints.moves[first]) cost -= TITLE_HINT_BONUS
    return cost
  }

  /**
   * Cost of leaving the games from `from` on out of every episode. While a
   * season is being published, any of them may be in an episode not out yet,
   * even the rest of the last episode's sitting: a 90-minute blitz sitting
   * fills three episodes. The video's length decides where the last one ends,
   * and the games at that edge stay uncertain until the next one comes out.
   */
  function tailCost(from: number): number {
    return isOngoing ? 0 : skipPrefix[gameCount] - skipPrefix[from]
  }

  // Forward pass. best[e][p]: lowest cost of episodes [0, e) using exactly
  // the first p games, each in an episode or skipped.
  // reach[e][i]: lowest cost of episodes [0, e) with games [0, i) used or
  // skipped, so the next episode can start at game i.
  const best = Array.from({ length: episodeCount + 1 }, () => new Float64Array(gameCount + 1).fill(Infinity))
  const reach: Float64Array[] = []
  const reachFrom: Int32Array[] = []
  // startOf[e][p]: first game of episode e-1 when it ends at p, or -1 when it is empty.
  const startOf = Array.from({ length: episodeCount + 1 }, () => new Int32Array(gameCount + 1).fill(-1))
  for (let p = 0; p <= gameCount; p++) best[0][p] = skipPrefix[p]

  for (let e = 0; e < episodeCount; e++) {
    const row = new Float64Array(gameCount + 1)
    const rowFrom = new Int32Array(gameCount + 1)
    let runningMin = Infinity
    let runningArg = -1
    for (let i = 0; i <= gameCount; i++) {
      const value = best[e][i] - skipPrefix[i]
      if (value < runningMin) {
        runningMin = value
        runningArg = i
      }
      row[i] = runningMin + skipPrefix[i]
      rowFrom[i] = runningArg
    }
    reach.push(row)
    reachFrom.push(rowFrom)

    for (let end = 0; end <= gameCount; end++) {
      let cost = best[e][end] + EMPTY_EPISODE_COST
      let start = -1
      for (let first = Math.max(0, end - MAX_GAMES_PER_EPISODE); first < end; first++) {
        if (row[first] === Infinity) continue
        const candidate = row[first] + blockCost(e, first, end)
        if (candidate < cost) {
          cost = candidate
          start = first
        }
      }
      best[e + 1][end] = cost
      startOf[e + 1][end] = start
    }
  }

  // Backward pass. after[e][p]: lowest cost of episodes [e, episodeCount)
  // when the first p games are already used.
  const after = Array.from({ length: episodeCount + 1 }, () => new Float64Array(gameCount + 1).fill(Infinity))
  for (let p = 0; p <= gameCount; p++) after[episodeCount][p] = tailCost(p)
  for (let e = episodeCount - 1; e >= 0; e--) {
    let suffixMin = Infinity
    for (let p = gameCount; p >= 0; p--) {
      let startingHere = Infinity
      for (let end = p + 1; end <= Math.min(gameCount, p + MAX_GAMES_PER_EPISODE); end++) {
        startingHere = Math.min(startingHere, blockCost(e, p, end) + after[e + 1][end])
      }
      suffixMin = Math.min(suffixMin, skipPrefix[p] + startingHere)
      after[e][p] = Math.min(EMPTY_EPISODE_COST + after[e + 1][p], suffixMin - skipPrefix[p])
    }
  }

  // Trace the best split back from the end.
  let end = 0
  let total = Infinity
  for (let p = 0; p <= gameCount; p++) {
    const candidate = best[episodeCount][p] + tailCost(p)
    if (candidate < total) {
      total = candidate
      end = p
    }
  }
  const chosen: EpisodeMatch["games"][] = new Array(episodeCount)
  for (let e = episodeCount - 1; e >= 0; e--) {
    const first = startOf[e + 1][end]
    if (first === -1) {
      chosen[e] = null
    } else {
      chosen[e] = { first, end }
      end = reachFrom[e][first]
    }
  }

  // A game's margin: how much worse the best split gets when the game must
  // leave its episode. When an episode's edges are unclear, the games in its
  // middle can still be certain.
  return chosen.map((games, e) => {
    if (!games) return { games, gameMargins: [] }

    let emptyCost = Infinity
    for (let p = 0; p <= gameCount; p++) {
      emptyCost = Math.min(emptyCost, best[e][p] + EMPTY_EPISODE_COST + after[e + 1][p])
    }
    // Cheapest split where episode e ends at or before game k, or starts after it.
    const endingBy = new Float64Array(gameCount + 1).fill(Infinity)
    const startingFrom = new Float64Array(gameCount + 2).fill(Infinity)
    for (let last = 1; last <= gameCount; last++) {
      for (let first = Math.max(0, last - MAX_GAMES_PER_EPISODE); first < last; first++) {
        if (reach[e][first] === Infinity) continue
        const cost = reach[e][first] + blockCost(e, first, last) + after[e + 1][last]
        endingBy[last] = Math.min(endingBy[last], cost)
        startingFrom[first] = Math.min(startingFrom[first], cost)
      }
    }
    for (let k = 1; k <= gameCount; k++) endingBy[k] = Math.min(endingBy[k], endingBy[k - 1])
    for (let k = gameCount - 1; k >= 0; k--) startingFrom[k] = Math.min(startingFrom[k], startingFrom[k + 1])

    const gameMargins: number[] = []
    for (let k = games.first; k < games.end; k++) {
      const alternative = Math.min(emptyCost, endingBy[k], startingFrom[k + 1])
      gameMargins.push(alternative - total)
    }
    return { games, gameMargins }
  })
}
