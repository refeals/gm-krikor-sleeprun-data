"use client"

import { Share } from "lucide-react"

import { useTransientFlag } from "@/hooks/use-transient-flag"
import { copyText } from "@/lib/clipboard"

const FEEDBACK_MS = 2000

export function ShareButton({ title }: { title: string }) {
  const [isCopied, showCopied] = useTransientFlag(FEEDBACK_MS)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        // Closing the share sheet is not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    if (await copyText(url)) showCopied()
  }

  return (
    <div className="flex items-center gap-1">
      <span role="status" className="text-sm text-text-secondary">
        {isCopied ? "Link copiado" : ""}
      </span>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartilhar"
        className="flex size-11 items-center justify-center rounded-control transition-colors duration-150 hover:bg-surface active:bg-surface-pressed"
      >
        <Share aria-hidden className="size-5" />
      </button>
    </div>
  )
}
