import { ChevronDown } from "lucide-react"
import { useId } from "react"

import { cn } from "@/lib/utils"

type SelectFieldProps<T extends string> = {
  label: string
  /** Visible labels sit beside the field; otherwise the label is for screen readers only. */
  isLabelVisible?: boolean
  /** "field" is a bordered control; "plain" is text with a chevron, for the sort order. */
  variant?: "field" | "plain"
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

export function SelectField<T extends string>({
  label,
  isLabelVisible = false,
  variant = "field",
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const selectId = useId()
  const isPlain = variant === "plain"

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className={cn(isLabelVisible ? "text-sm text-text-muted" : "sr-only")}>
        {label}
      </label>
      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value}
          onChange={(event) => {
            // Only values offered as options get through, typed as such.
            const option = options.find((candidate) => candidate.value === event.target.value)
            if (option) onChange(option.value)
          }}
          className={cn(
            "appearance-none text-text",
            isPlain
              ? "min-h-11 bg-transparent pr-6 pl-1 text-sm font-semibold"
              : "min-h-12 rounded-control border border-border bg-surface pr-9 pl-3.5 text-base transition-colors duration-150 hover:border-border-strong",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none absolute size-4",
            isPlain ? "right-0" : "top-1/2 right-3 -translate-y-1/2 text-text-muted",
          )}
        />
      </div>
    </div>
  )
}
