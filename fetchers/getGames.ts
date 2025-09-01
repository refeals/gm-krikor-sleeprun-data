"use server"

import { Game } from "@/types/Game"

export const getGames = async (username = "sleeprerun") => {
  try {
    // Fetch the archives (all available months with games)
    const archiveResponse = await fetch(
      `https://api.chess.com/pub/player/${username}/games/archives`
    )
    if (!archiveResponse.ok) {
      throw new Error(
        `Failed to fetch archives for user ${username}: ${archiveResponse.statusText}`
      )
    }

    const { archives } = (await archiveResponse.json()) as {
      archives: string[]
    }

    // Fetch games from each archive (each URL corresponds to a month's games)
    const gameFetches = archives.map((url) =>
      fetch(url).then((res) => res.json())
    )

    // Wait for all game fetches to complete
    const gameResults = await Promise.all(gameFetches)

    // Extract the games from each month's data
    const allGames = gameResults
      .flatMap((result) => result.games)
      .reverse() as Game[]

    return allGames
  } catch (error) {
    console.error("Error fetching games:", error)
    return []
  }
}
