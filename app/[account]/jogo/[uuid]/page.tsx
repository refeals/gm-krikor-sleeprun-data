import Link from "next/link"
import { notFound } from "next/navigation"

import { isAccountId } from "@/lib/accounts"
import { fetchAccountGames } from "@/lib/chess-com"
import { describeGame } from "@/lib/game-text"
import { toGameViews } from "@/lib/game-view"

// No game page is built ahead of time. Each one renders on its first visit
// and is then cached; an empty list is what enables that (ISR).
export function generateStaticParams(): { account: string; uuid: string }[] {
  return []
}

export default async function GamePage({ params }: PageProps<"/[account]/jogo/[uuid]">) {
  const { account, uuid } = await params
  if (!isAccountId(account)) notFound()

  // The rating delta depends on the previous game, so the whole history is
  // derived. Every month comes from the fetch cache.
  const games = toGameViews(await fetchAccountGames(account), account)
  const game = games.find((candidate) => candidate.uuid === uuid)
  if (!game) notFound()

  // Placeholder for the routing step. The full game screen comes in the next block.
  return (
    <main className="flex flex-col gap-4 py-4">
      <Link href={`/${account}`} className="inline-flex min-h-11 items-center font-semibold">
        Jogos
      </Link>
      <h1 className="font-display text-2xl font-bold">{describeGame(game)}</h1>
      <a
        href={game.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-13 items-center justify-center rounded-card bg-accent px-4 font-bold text-on-accent"
      >
        Abrir no Chess.com
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </main>
  )
}
