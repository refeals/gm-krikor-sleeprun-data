import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ChoiceChipProps = {
  isPressed: boolean
  onClick: () => void
  children: ReactNode
  /** "sheet" sits on a surface, so unpressed chips use the page background. */
  surface?: "page" | "sheet"
}

export function ChoiceChip({ isPressed, onClick, children, surface = "page" }: ChoiceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-full border px-4 text-base font-semibold transition-colors duration-150",
        isPressed && "border-accent bg-accent text-on-accent active:bg-accent-hover",
        !isPressed && surface === "page" && "border-border bg-surface text-text hover:border-border-strong active:bg-surface-pressed",
        !isPressed && surface === "sheet" && "border-border-strong bg-bg text-text hover:border-text-muted active:bg-surface-pressed",
      )}
    >
      {children}
    </button>
  )
}
