/** Copies text, falling back to a hidden textarea where the async API is missing or blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.append(textarea)
    textarea.select()
    try {
      return document.execCommand("copy")
    } catch {
      return false
    } finally {
      textarea.remove()
    }
  }
}

/**
 * Copies text that still has to be fetched. Safari only allows the copy while
 * the click is being handled, so the pending text goes straight into a
 * ClipboardItem; the browser waits for it. Elsewhere it fetches, then copies.
 */
export async function copyTextFrom(loadText: () => Promise<string>): Promise<boolean> {
  const pendingText = loadText()

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const blob = pendingText.then((text) => new Blob([text], { type: "text/plain" }))
      // If ClipboardItem or write throws before consuming it, a later rejection
      // of `blob` would go unhandled. The fallback below reports the failure.
      blob.catch(() => undefined)
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })])
      return true
    } catch {
      // Fall through to the plain copy below.
    }
  }

  try {
    return await copyText(await pendingText)
  } catch {
    return false
  }
}
