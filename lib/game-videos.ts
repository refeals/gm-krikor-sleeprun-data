import "server-only"

import gameVideosJson from "@/data/game-videos.json"
import type { AccountId } from "@/lib/accounts"
import { formatEpisodeCode } from "@/lib/youtube"
import type { GameVideo, GameVideosFile, VideoEpisode } from "@/types/game-videos"

// Written by scripts/sync-videos.mts. Server only: it is about 600 KB, and
// each game sends the client just its own episode.
const gameVideos = gameVideosJson as GameVideosFile

type IndexedGame = { episode: VideoEpisode; isCertain: boolean }

const indexes = new Map<AccountId, Map<string, IndexedGame>>()

/** Game UUID to episode, built on first use. */
function getIndex(accountId: AccountId): Map<string, IndexedGame> {
  let index = indexes.get(accountId)
  if (!index) {
    index = new Map()
    for (const episode of gameVideos[accountId] ?? []) {
      for (const uuid of episode.gameUuids) index.set(uuid, { episode, isCertain: true })
      for (const uuid of episode.uncertainGameUuids) index.set(uuid, { episode, isCertain: false })
    }
    indexes.set(accountId, index)
  }
  return index
}

/** The episode that shows the game, or null when none does yet. */
export function findGameVideo(accountId: AccountId, uuid: string): GameVideo | null {
  const found = getIndex(accountId).get(uuid)
  if (!found) return null
  return {
    videoId: found.episode.videoId,
    code: formatEpisodeCode(found.episode.season, found.episode.episode),
    isCertain: found.isCertain,
    startSeconds: found.episode.startSeconds?.[uuid] ?? null,
  }
}

/** The episode's title, for the game page. */
export function findGameVideoTitle(accountId: AccountId, uuid: string): string | null {
  return getIndex(accountId).get(uuid)?.episode.title ?? null
}
