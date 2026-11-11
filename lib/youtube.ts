// Shared by the app and the scripts, so it imports nothing.

/** "S07E045", or "S02 bônus" for an episode without a number. */
export function formatEpisodeCode(season: number, episode: number | null): string {
  const seasonCode = `S${String(season).padStart(2, "0")}`
  return episode === null ? `${seasonCode} bônus` : `${seasonCode}E${String(episode).padStart(3, "0")}`
}

export function getYouTubeVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}
