// Shape of data/game-videos.json, written by scripts/sync-videos.mts.

import type { AccountId } from "@/lib/accounts"

export type VideoEpisode = {
  /** YouTube video id. */
  videoId: string
  /** Without the series name and episode code at the end. */
  title: string
  season: number
  /** Null for an episode without a number, such as a bonus. */
  episode: number | null
  /** ISO 8601. */
  publishedAt: string
  /** Chess.com UUIDs of the games the episode shows. */
  gameUuids: string[]
  /** Games probably in the episode, though a neighbouring one fit almost as well. */
  uncertainGameUuids: string[]
}

/** Each account's episodes, oldest first. */
export type GameVideosFile = Record<AccountId, VideoEpisode[]>

/** The episode that shows a game, as the list and game pages get it. */
export type GameVideo = {
  videoId: string
  /** "S07E045". */
  code: string
  /** False when a neighbouring episode fit the game almost as well. */
  isCertain: boolean
}
