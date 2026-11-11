import type { Metadata } from "next"
import { Suspense } from "react"

import { GameBrowser } from "@/components/game-browser"
import { GameBrowserSkeleton } from "@/components/game-browser-skeleton"
import { fetchAccountGames } from "@/lib/chess-com"
import { findGameVideo } from "@/lib/game-videos"
import { toGameViews } from "@/lib/game-view"
import { reportUnknownOpeningFamilies } from "@/lib/openings"
import { requireAccount } from "@/lib/route-params"

// Nothing is built ahead of time: each account page renders on its first
// visit and is cached from then on (ISR). That keeps deploys independent of
// Chess.com; a build that fetched the games would fail whenever the API did.
// The months themselves stay in the fetch cache across deploys.
export function generateStaticParams(): { account: string }[] {
  return []
}

// Regenerated at most every 5 minutes. Filters are read on the client so
// they don't make the route dynamic.
export const revalidate = 300

// Each account gets its own tab title, which is also what the route
// announcer reads to screen readers after switching accounts.
export async function generateMetadata({ params }: PageProps<"/[account]">): Promise<Metadata> {
  const account = await requireAccount(params)
  return { title: `${account.label} | Jogos do GM Krikor` }
}

export default async function AccountGamesPage({ params }: PageProps<"/[account]">) {
  const account = await requireAccount(params)
  const games = toGameViews(await fetchAccountGames(account.id), account.id, (uuid) =>
    findGameVideo(account.id, uuid),
  )
  reportUnknownOpeningFamilies(games.map((game) => game.openingName))

  return (
    // useSearchParams needs a Suspense boundary to keep the page static.
    <Suspense fallback={<GameBrowserSkeleton />}>
      <GameBrowser accountId={account.id} games={games} />
    </Suspense>
  )
}
