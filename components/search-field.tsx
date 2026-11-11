"use client"

import { Search } from "lucide-react"
import { useEffect, useId, useState } from "react"

const SEARCH_DEBOUNCE_MS = 300

type SearchFieldProps = {
  /** Search term currently in the URL. */
  value: string
  onCommit: (value: string) => void
}

export function SearchField({ value: committedValue, onCommit }: SearchFieldProps) {
  const inputId = useId()
  const [draft, setDraft] = useState(committedValue)
  const [lastSeenValue, setLastSeenValue] = useState(committedValue)
  const [lastPushedValue, setLastPushedValue] = useState(committedValue)

  // Follow changes made elsewhere ("Limpar filtros", back and forward) without
  // overwriting what the reader typed after the last debounced push.
  if (committedValue !== lastSeenValue) {
    setLastSeenValue(committedValue)
    if (committedValue !== lastPushedValue) {
      setDraft(committedValue)
      setLastPushedValue(committedValue)
    }
  }

  useEffect(() => {
    const next = draft.trim()
    if (next === committedValue) return
    const timer = setTimeout(() => {
      setLastPushedValue(next)
      onCommit(next)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, committedValue, onCommit])

  return (
    <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-control border border-border bg-surface px-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
      <Search aria-hidden className="size-4.5 shrink-0 text-text-muted" />
      <label htmlFor={inputId} className="sr-only">
        Buscar por oponente ou abertura
      </label>
      <input
        id={inputId}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // Closes the on-screen keyboard; the search already runs as you type.
          if (event.key === "Enter") event.currentTarget.blur()
        }}
        placeholder="Oponente ou abertura"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent py-3 text-md text-text placeholder:text-placeholder focus-visible:outline-none"
      />
    </div>
  )
}
