"use client"

import { LoaderCircle } from "lucide-react"
import { useLinkStatus } from "next/link"

import { cn } from "@/lib/utils"

// Game links don't prefetch, so a tap can wait on the network for a moment.
// These show that the tap registered. Both must render inside a <Link>.

/** Thin accent bar along the bottom of a card. The card needs `relative`. */
export function LinkPendingBar() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full transition-opacity duration-150", pending ? "opacity-100" : "opacity-0")}
    >
      {/* Animated only while pending: every card has a bar, and an idle
          infinite animation per card adds up after "Carregar mais". */}
      {pending ? (
        <span className="block h-full w-1/3 animate-link-pending rounded-full bg-accent motion-reduce:w-full motion-reduce:animate-none" />
      ) : null}
    </span>
  )
}

/** Small spinner beside a link's text, for the table. */
export function LinkPendingSpinner() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <LoaderCircle
      aria-hidden
      className="ml-1.5 inline size-3.5 animate-spin align-[-2px] text-accent motion-reduce:animate-none"
    />
  )
}
