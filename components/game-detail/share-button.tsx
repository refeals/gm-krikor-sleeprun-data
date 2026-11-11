"use client"

import { Share } from "lucide-react"

import { useTransientValue } from "@/hooks/use-transient-flag"
import { copyText } from "@/lib/clipboard"

const FEEDBACK_MS = 2000
const FEEDBACK_TEXT = { copied: "Link copiado", failed: "Não foi possível copiar o link" }

export function ShareButton({ title }: { title: string }) {
  const [result, setResult] = useTransientValue<"copied" | "failed">(FEEDBACK_MS)

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
    setResult((await copyText(url)) ? "copied" : "failed")
  }

  return (
    <div className="flex items-center gap-1">
      <span role="status" className="text-sm text-text-secondary">
        {result ? FEEDBACK_TEXT[result] : ""}
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
