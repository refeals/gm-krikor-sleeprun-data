"use client"

import { useEffect } from "react"

/**
 * After a client navigation the tapped card is gone and focus falls to
 * <body>. Moving it to <main> puts keyboard and screen reader users at the
 * start of the new page instead of the top of the document.
 */
export function FocusMainOnMount() {
  useEffect(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true })
  }, [])
  return null
}
