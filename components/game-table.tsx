"use client"

import { ExternalLink, Youtube } from "lucide-react"
import Link from "next/link"
import { useRef, useState, type MouseEvent } from "react"

import { PieceSquare, RatingChange, ResultPill } from "@/components/game-marks"
import { LinkPendingSpinner } from "@/components/link-pending"
import { useTransientValue } from "@/hooks/use-transient-flag"
import { copyTextFrom } from "@/lib/clipboard"
import { formatAccuracy, formatGameDate } from "@/lib/format"
import { isModifiedClick } from "@/lib/events"
import { COLOR_NAME, formatOpeningName } from "@/lib/game-text"
import { toArchiveMonth, type GameView } from "@/lib/game-view"
import { cn } from "@/lib/utils"
import { getYouTubeVideoUrl } from "@/lib/youtube"

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
  "inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border-strong px-3 text-sm font-semibold transition-colors duration-150 hover:border-text-muted active:bg-surface-pressed"

/** Desktop list. The opponent's name opens the game page. */
export function GameTable({ accountId, games, caption, gameHref, onOpenGame }: GameTableProps) {
  const [copyState, setCopyState] = useTransientValue<CopyState>(FEEDBACK_MS)
  // Two quick clicks on different rows can finish out of order. Only the
  // latest request may report, matching what ends up in the clipboard.
  const latestRequestRef = useRef(0)
  const [copyingUuid, setCopyingUuid] = useState<string | null>(null)

  async function handleCopy(game: GameView) {
    const requestId = ++latestRequestRef.current
    setCopyingUuid(game.uuid)
    const isCopied = await copyTextFrom(() => loadPgn(accountId, game))
    if (requestId !== latestRequestRef.current) return
    setCopyingUuid(null)
    setCopyState({ uuid: game.uuid, status: isCopied ? "copied" : "failed" })
  }

  // The whole row opens the game. The opponent's name stays the real link
  // (keyboard, screen readers, "open in new tab"); a click anywhere else in
  // the row forwards to it. Clicks on the row's own links and buttons, and
  // text selection, are left alone.
  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, game: GameView) {
    if ((event.target as HTMLElement).closest("a, button")) return
    if (window.getSelection()?.toString()) return
    if (isModifiedClick(event)) {
      window.open(gameHref(game), "_blank", "noopener")
      return
    }
    event.currentTarget.querySelector<HTMLAnchorElement>("a[data-row-link]")?.click()
  }

  function handleRowAuxClick(event: MouseEvent<HTMLTableRowElement>, game: GameView) {
    if (event.button !== 1 || (event.target as HTMLElement).closest("a, button")) return
    window.open(gameHref(game), "_blank", "noopener")
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
            <th scope="col" className={cn(headerCellClassName, "text-right")}>Rating</th>
            <th scope="col" className={cn(headerCellClassName, "text-right")}>Precisão</th>
            <th scope="col" className={cn(headerCellClassName, "text-right")}>Lances</th>
            <th scope="col" className={cn(headerCellClassName, "text-right")}>Data</th>
            <th scope="col" className={cn(headerCellClassName, "text-right")}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr
              key={game.uuid}
              onClick={(event) => handleRowClick(event, game)}
              onAuxClick={(event) => handleRowAuxClick(event, game)}
              className="cursor-pointer transition-colors duration-150 hover:bg-surface-pressed"
            >
              <td className={cellClassName}>
                <ResultPill result={game.result} />
              </td>
              <td className={cellClassName}>
                <span className="flex items-center gap-2">
                  <PieceSquare color={game.color} />
                  <Link
                    href={gameHref(game)}
                    prefetch={false}
                    data-row-link
                    onClick={() => onOpenGame(game)}
                    title={game.opponent.username}
                    className="max-w-[180px] truncate font-semibold underline-offset-4 hover:underline"
                  >
                    <span className="sr-only">Ver partida contra </span>
                    {game.opponent.username}
                    <LinkPendingSpinner />
                  </Link>
                  <span className="text-xs text-text-muted tabular-nums">{game.opponent.rating}</span>
                  <span className="sr-only">, Krikor de {COLOR_NAME[game.color]}</span>
                </span>
              </td>
              <td
                className={cn(cellClassName, "max-w-[200px] truncate text-text-secondary")}
                title={game.openingName ? formatOpeningName(game.openingName) : undefined}
              >
                {formatOpeningName(game.openingName, "Desconhecida")}
              </td>
              <td className={cn(cellClassName, "text-right tabular-nums")}>
                <span className="inline-flex items-baseline gap-2">
                  <span className="font-display font-bold">{game.rating}</span>
                  <RatingChange game={game} />
                </span>
              </td>
              <td className={cn(cellClassName, "text-right font-display font-bold tabular-nums")}>
                {game.accuracy ? (
                  formatAccuracy(game.accuracy.own)
                ) : (
                  <>
                    <span aria-hidden className="text-text-muted">—</span>
                    <span className="sr-only">sem análise</span>
                  </>
                )}
              </td>
              <td className={cn(cellClassName, "text-right tabular-nums")}>{game.moveCount}</td>
              <td className={cn(cellClassName, "text-right whitespace-nowrap text-text-secondary tabular-nums")}>
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
                  {game.video ? (
                    // Icon only, so the actions still fit beside the columns.
                    <a
                      href={getYouTubeVideoUrl(game.video.videoId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Episódio ${game.video.code} no YouTube${game.video.isCertain ? "" : " (provável)"}`}
                      className={cn(actionClassName, "w-11 justify-center px-0")}
                    >
                      <Youtube aria-hidden className="size-4.5" />
                      <span className="sr-only">
                        Assistir {game.video.isCertain ? "o episódio" : "o provável episódio"} da partida contra{" "}
                        {game.opponent.username} no YouTube (abre em nova aba)
                      </span>
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleCopy(game)}
                    disabled={copyingUuid === game.uuid}
                    aria-busy={copyingUuid === game.uuid}
                    className={cn(actionClassName, "min-w-[88px] justify-center disabled:cursor-wait disabled:opacity-60")}
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
