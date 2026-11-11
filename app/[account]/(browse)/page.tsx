import { Suspense } from "react"

import { GameBrowser } from "@/components/game-browser"
import { ACCOUNTS } from "@/lib/accounts"
import { fetchAccountGames } from "@/lib/chess-com"
import { toGameViews } from "@/lib/game-view"
import { requireAccount } from "@/lib/route-params"

// Only the known accounts exist; anything else is a 404. This stays on the
// page: on a layout it would also cover the game pages below it.
export const dynamicParams = false

// Static page regenerated at most every 5 minutes. Filters are read on the
// client so they don't make the route dynamic.
export const revalidate = 300

export function generateStaticParams() {
  return ACCOUNTS.map((account) => ({ account: account.id }))
}

export default async function AccountGamesPage({ params }: PageProps<"/[account]">) {
  const account = await requireAccount(params)
  const games = toGameViews(await fetchAccountGames(account.id), account.id)

  return (
    // useSearchParams needs a Suspense boundary to keep the page static.
    <Suspense fallback={<p role="status" className="py-8 text-sm text-text-muted">Carregando jogos…</p>}>
      <GameBrowser accountId={account.id} games={games} />
    </Suspense>
  )
}
