import { ChoiceChip } from "@/components/choice-chip"
import type { ResultFilter } from "@/lib/game-query"
import { RESULT_FILTER_OPTIONS } from "@/lib/game-text"

type ResultChipsProps = {
  value: ResultFilter
  onChange: (value: ResultFilter) => void
}

export function ResultChips({ value, onChange }: ResultChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar por resultado"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0"
    >
      {RESULT_FILTER_OPTIONS.map((option) => (
        <ChoiceChip
          key={option.value}
          isPressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </ChoiceChip>
      ))}
    </div>
  )
}
