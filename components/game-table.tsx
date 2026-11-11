"use client"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

import { PieceSquare, RatingChange, ResultPill } from "@/components/game-marks"
import { useTransientValue } from "@/hooks/use-transient-flag"
import { copyTextFrom } from "@/lib/clipboard"
import { formatAccuracy, formatGameDate } from "@/lib/format"
import { toArchiveMonth, type GameView } from "@/lib/game-view"

const FEEDBACK_MS = 2000

type CopyState = { uuid: string; status: "copied" | "failed" }

type GameTableProps = {
  accountId: string
  games: readonly GameView[]
  caption: string
  gameHref: (game: GameView) => string
  onOpenGame: (game: GameView) => void
}

async function loadPgn(accountId: string, game: GameView): Promise<string> {
  const month = toArchiveMonth(game.endedAt)
  const response = await fetch(
    `/api/games/${accountId}/${encodeURIComponent(game.uuid)}/pgn?month=${month}`,
  )
  if (!response.ok) throw new Error(`PGN request failed with ${response.status}`)
  return response.text()
}

const headerCellClassName =
  "border-b border-border px-3 py-3.5 text-sm font-semibold whitespace-nowrap text-text-muted first:pl-4 last:pr-4"
const cellClassName = "border-b border-border-subtle px-3 py-3 align-middle first:pl-4 last:pr-4"
const actionClassName =
  "inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border-strong px-3 text-sm font-semibold transition-colors duration-150 hover:border-text-muted"

/** Desktop list. The opponent's name opens the game page. */
export function GameTable({ accountId, games, caption, gameHref, onOpenGame }: GameTableProps) {
  const [copyState, setCopyState] = useTransientValue<CopyState>(FEEDBACK_MS)
  // Two quick clicks on different rows can finish out of order. Only the
  // latest request may report, matching what ends up in the clipboard.
  const latestRequestRef = useRef(0)

  async function handleCopy(game: GameView) {
    const requestId = ++latestRequestRef.current
    const isCopied = await copyTextFrom(() => loadPgn(accountId, game))
    if (requestId !== latestRequestRef.current) return
    setCopyState({ uuid: game.uuid, status: isCopied ? "copied" : "failed" })
  }

  // The accessible name always contains the visible word (WCAG 2.5.3).
  function renderCopyLabel(game: GameView) {
    const opponent = game.opponent.username
    if (copyState?.uuid === game.uuid && copyState.status === "copied") {
      return (
        <>
          Copiado<span className="sr-only">: PGN da partida contra {opponent}</span>
        </>
      )
    }
    if (copyState?.uuid === game.uuid && copyState.status === "failed") {
      return (
        <>
          Erro<span className="sr-only"> ao copiar o PGN da partida contra {opponent}</span>
        </>
      )
    }
    return (
      <>
        <span className="sr-only">Copiar </span>PGN
        <span className="sr-only"> da partida contra {opponent}</span>
      </>
    )
  }

  return (
    // relative: the sr-only texts in the cells are absolutely positioned and
    // would otherwise escape the scroll container and widen the page.
    <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[900px] border-collapse text-left text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={headerCellClassName}>Resultado</th>
            <th scope="col" className={headerCellClassName}>Oponente</th>
            <th scope="col" className={headerCellClassName}>Abertura</th>
            <th scope="col" className={`${headerCellClassName} text-right`}>Rating</th>
            <th scope="col" className={`${headerCellClassName} text-right`}>Precisão</th>
            <th scope="col" className={`${headerCellClassName} text-right`}>Lances</th>
            <th scope="col" className={`${headerCellClassName} text-right`}>Data</th>
            <th scope="col" className={`${headerCellClassName} text-right`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.uuid} className="transition-colors duration-150 hover:bg-surface-pressed">
              <td className={cellClassName}>
                <ResultPill result={game.result} />
              </td>
              <td className={cellClassName}>
                <span className="flex items-center gap-2">
                  <PieceSquare color={game.color} />
                  <Link
                    href={gameHref(game)}
                    prefetch={false}
                    onClick={() => onOpenGame(game)}
                    title={game.opponent.username}
                    className="max-w-[160px] truncate font-semibold underline-offset-4 hover:underline"
                  >
                    {game.opponent.username}
                  </Link>
                  <span className="text-xs text-text-muted tabular-nums">{game.opponent.rating}</span>
                  <span className="sr-only">, Krikor de {game.color === "white" ? "brancas" : "pretas"}</span>
                </span>
              </td>
              <td
                className={`${cellClassName} max-w-[240px] truncate text-text-secondary`}
                title={game.openingName ?? undefined}
              >
                {game.openingName ?? "Desconhecida"}
              </td>
              <td className={`${cellClassName} text-right tabular-nums`}>
                <span className="inline-flex items-baseline gap-2">
                  <span className="font-display font-bold">{game.rating}</span>
                  <RatingChange game={game} />
                </span>
              </td>
              <td className={`${cellClassName} text-right font-display font-bold tabular-nums`}>
                {game.accuracy ? (
                  formatAccuracy(game.accuracy.own)
                ) : (
                  <>
                    <span aria-hidden className="text-text-muted">—</span>
                    <span className="sr-only">sem análise</span>
                  </>
                )}
              </td>
              <td className={`${cellClassName} text-right tabular-nums`}>{game.moveCount}</td>
              <td className={`${cellClassName} text-right whitespace-nowrap text-text-secondary tabular-nums`}>
                {formatGameDate(game.endedAt)}
              </td>
              <td className={cellClassName}>
                <span className="flex justify-end gap-2">
                  {game.url ? (
                    <a href={game.url} target="_blank" rel="noopener noreferrer" className={actionClassName}>
                      <span className="sr-only">Abrir partida contra {game.opponent.username} no </span>
                      Chess.com
                      <ExternalLink aria-hidden className="size-3.5" />
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleCopy(game)}
                    className={`${actionClassName} min-w-[88px] justify-center`}
                  >
                    {renderCopyLabel(game)}
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span role="status" className="sr-only">
        {copyState?.status === "copied"
          ? "PGN copiado"
          : copyState?.status === "failed"
            ? "Não foi possível copiar o PGN"
            : ""}
      </span>
    </div>
  )
}
