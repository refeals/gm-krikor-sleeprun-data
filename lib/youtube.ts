// Shared by the app and the scripts, so it imports nothing.

/** "S07E045", or "S02 bônus" for an episode without a number. */
export function formatEpisodeCode(season: number, episode: number | null): string {
  const seasonCode = `S${String(season).padStart(2, "0")}`
  return episode === null ? `${seasonCode} bônus` : `${seasonCode}E${String(episode).padStart(3, "0")}`
}

/** The video, from `startSeconds` when given. */
export function getYouTubeVideoUrl(videoId: string, startSeconds?: number | null): string {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
  return startSeconds ? `${url}&t=${startSeconds}s` : url
}

/** "16:10", or "1:02:05" past an hour. */
export function formatVideoTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`
}
