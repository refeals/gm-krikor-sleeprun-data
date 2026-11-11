import { ChevronDown } from "lucide-react"
import { useId } from "react"

import type { SortOrder } from "@/lib/game-query"

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "accuracy", label: "Maior precisão" },
]

type SortSelectProps = {
  value: SortOrder
  onChange: (value: SortOrder) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  const selectId = useId()
  return (
    <div className="relative flex items-center">
      <label htmlFor={selectId} className="sr-only">
        Ordenar
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value as SortOrder)}
        className="min-h-11 cursor-pointer appearance-none bg-transparent pr-6 pl-1 text-sm font-semibold text-text"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-0 size-4" />
    </div>
  )
}
