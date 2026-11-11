import { Suspense } from "react"

import { GameBrowser } from "@/components/game-browser"
import { GameBrowserSkeleton } from "@/components/game-browser-skeleton"
import { fetchAccountGames } from "@/lib/chess-com"
import { toGameViews } from "@/lib/game-view"
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

export default async function AccountGamesPage({ params }: PageProps<"/[account]">) {
  const account = await requireAccount(params)
  const games = toGameViews(await fetchAccountGames(account.id), account.id)

  return (
    // useSearchParams needs a Suspense boundary to keep the page static.
    <Suspense fallback={<GameBrowserSkeleton />}>
      <GameBrowser accountId={account.id} games={games} />
    </Suspense>
  )
}
