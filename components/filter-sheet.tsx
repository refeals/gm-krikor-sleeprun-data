"use client"

import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react"

import { ChoiceChip } from "@/components/choice-chip"
import { formatCount } from "@/lib/format"
import { filterGames, type ColorFilter, type GameQuery } from "@/lib/game-query"
import type { GameView } from "@/lib/game-view"

const COLOR_OPTIONS: { value: ColorFilter; label: string }[] = [
  { value: "all", label: "Ambas" },
  { value: "white", label: "Brancas" },
  { value: "black", label: "Pretas" },
]

// Matches --animate-sheet-out, plus margin. Closing never waits on an
// animationend that a browser might not fire.
const CLOSE_FALLBACK_MS = 260

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
      className="fixed inset-x-0 top-auto bottom-0 mx-auto my-0 max-h-[85dvh] w-full max-w-[560px] overflow-y-auto rounded-t-sheet border-0 border-t border-border-strong bg-surface p-0 text-text animate-sheet-in backdrop:bg-bg/85 backdrop:animate-fade-in data-[closing=true]:animate-sheet-out data-[closing=true]:backdrop:animate-fade-out"
    >
      <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong" />

      <div className="flex items-center justify-between pt-2 pr-2 pb-1 pl-5">
        <h2 id={titleId} className="font-display text-2xl font-bold">
          Filtros
        </h2>
        <button
          type="button"
          onClick={() => {
            setColor("all")
            setYear(null)
          }}
          className="min-h-11 px-3 text-base font-semibold text-accent hover:text-accent-hover"
        >
          Limpar
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-3 pb-4">
        <fieldset className="flex flex-col">
          <legend className="mb-2.5 text-sm font-semibold text-text-muted">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
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

      <div className="border-t border-border px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <button
          type="button"
          onClick={handleApply}
          disabled={matchCount === 0}
          className="min-h-13 w-full rounded-card bg-accent px-4 text-md font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:bg-surface-pressed disabled:text-disabled"
        >
          {matchCount === 0
            ? "Nenhum jogo com esses filtros"
            : `Mostrar ${formatCount(matchCount)} ${matchCount === 1 ? "jogo" : "jogos"}`}
        </button>
      </div>
    </dialog>
  )
}
