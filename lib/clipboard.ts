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
