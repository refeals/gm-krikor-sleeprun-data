"use client"

import { X } from "lucide-react"
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react"

import { ChoiceChip } from "@/components/choice-chip"
import { formatCount } from "@/lib/format"
import { filterGames, type GameQuery } from "@/lib/game-query"
import { COLOR_FILTER_OPTIONS } from "@/lib/game-text"
import type { GameView } from "@/lib/game-view"

// Matches --animate-sheet-out, plus margin. Closing never waits on an
// animationend that a browser might not fire.
const CLOSE_FALLBACK_MS = 260
// Dragging the top of the sheet down this far closes it; less snaps back.
const DRAG_CLOSE_DISTANCE = 80

export type SheetFilters = Pick<GameQuery, "color" | "year">

type FilterSheetProps = {
  id: string
  games: readonly GameView[]
  query: GameQuery
  years: readonly number[]
  onApply: (filters: SheetFilters) => void
  /** Called once the sheet has finished closing; the parent unmounts it. */
  onClosed: () => void
}

/**
 * Bottom sheet built on a modal <dialog>: focus trap, Esc and an inert page
 * come from the browser. Choices stay pending until "Mostrar N jogos".
 * Mounted only while open, so pending choices start from the URL every time.
 */
export function FilterSheet({ id, games, query, years, onApply, onClosed }: FilterSheetProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const hasClosedRef = useRef(false)
  const [isClosing, setIsClosing] = useState(false)
  const dragStartYRef = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [color, setColor] = useState(query.color)
  const [year, setYear] = useState(query.year)

  const matchCount = useMemo(
    () => filterGames(games, { ...query, color, year }).length,
    [games, query, color, year],
  )

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    if (!isClosing) return
    const timer = setTimeout(finishClosing, CLOSE_FALLBACK_MS)
    return () => clearTimeout(timer)
  })

  function finishClosing() {
    if (hasClosedRef.current) return
    hasClosedRef.current = true
    dialogRef.current?.close()
    onClosed()
  }

  function requestClose() {
    setIsClosing(true)
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    // Clicks on ::backdrop land on the dialog itself; content clicks land on children.
    if (event.target === event.currentTarget) requestClose()
  }

  function handleApply() {
    onApply({ color, year })
    requestClose()
  }

  // Swipe down to dismiss, from the handle and title row. Buttons there
  // keep working: a press that starts on one never begins a drag.
  function handleDragStart(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return
    dragStartYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: PointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return
    setDragOffset(Math.max(0, event.clientY - dragStartYRef.current))
  }

  function handleDragEnd() {
    if (dragStartYRef.current === null) return
    dragStartYRef.current = null
    if (dragOffset > DRAG_CLOSE_DISTANCE) requestClose()
    else setDragOffset(0)
  }

  return (
    <dialog
      id={id}
      ref={dialogRef}
      aria-labelledby={titleId}
      data-closing={isClosing}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={handleBackdropClick}
      onAnimationEnd={() => {
        if (isClosing) finishClosing()
      }}
      // The dialog itself never scrolls: a click on its own scrollbar would
      // look like a backdrop click. The middle section scrolls instead.
      style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      className="fixed inset-x-0 top-auto bottom-0 mx-auto my-0 flex max-h-[85dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-sheet border-0 border-t border-border-strong bg-surface p-0 text-text animate-sheet-in backdrop:bg-bg/85 backdrop:animate-fade-in data-[closing=true]:animate-sheet-out data-[closing=true]:backdrop:animate-fade-out [&:not([open])]:hidden"
    >
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className="shrink-0 touch-none select-none"
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong" />

        <div className="flex items-center justify-between gap-2 pt-2 pr-2 pb-1 pl-5">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            Filtros
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setColor("all")
                setYear(null)
              }}
              className="min-h-11 rounded-control px-3 text-base font-semibold text-accent hover:text-accent-hover active:bg-surface-pressed"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Fechar filtros"
              className="flex size-11 items-center justify-center rounded-control text-text-secondary transition-colors duration-150 hover:bg-surface-pressed hover:text-text"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-5 pt-3 pb-4">
        <fieldset className="flex flex-col">
          <legend className="mb-2.5 text-sm font-semibold text-text-muted">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {COLOR_FILTER_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                surface="sheet"
                isPressed={color === option.value}
                onClick={() => setColor(option.value)}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col">
          <legend className="mb-2.5 text-sm font-semibold text-text-muted">Ano</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip surface="sheet" isPressed={year === null} onClick={() => setYear(null)}>
              Todos
            </ChoiceChip>
            {years.map((option) => (
              <ChoiceChip
                key={option}
                surface="sheet"
                isPressed={year === option}
                onClick={() => setYear(option)}
              >
                {option}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="shrink-0 border-t border-border px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <button
          type="button"
          onClick={handleApply}
          disabled={matchCount === 0}
          className="min-h-13 w-full rounded-card bg-accent px-4 text-md font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover active:bg-accent-hover disabled:bg-surface-pressed disabled:text-disabled"
        >
          {matchCount === 0
            ? "Nenhum jogo com esses filtros"
            : `Mostrar ${formatCount(matchCount)} ${matchCount === 1 ? "jogo" : "jogos"}`}
        </button>
      </div>
    </dialog>
  )
}
