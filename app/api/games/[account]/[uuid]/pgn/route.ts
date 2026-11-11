import type { NextRequest } from "next/server"

import { isAccountId } from "@/lib/accounts"
import { ChessComError, findAccountGame } from "@/lib/chess-com"
import { isGameUuid } from "@/lib/game-view"

// PGN of one game, for "Copiar PGN" in the desktop table. The list payload
// leaves PGNs out because they are 70% of the data. The client passes the
// game's archive month (?month=2026-11) so only that month is read.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/games/[account]/[uuid]/pgn">,
) {
  const { account, uuid } = await context.params
  if (!isAccountId(account) || !isGameUuid(uuid)) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const game = await findAccountGame(account, uuid, request.nextUrl.searchParams.get("month"))
    if (!game) return new Response("Not found", { status: 404 })

    return new Response(game.pgn, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        // A finished game's PGN is stable. The CDN keeps it for a month,
        // browsers for a day, in case Chess.com ever amends one.
        "Cache-Control": "public, max-age=86400, s-maxage=2592000",
      },
    })
  } catch (error) {
    if (error instanceof ChessComError) {
      return new Response("Chess.com did not respond", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      })
    }
    throw error
  }
}
