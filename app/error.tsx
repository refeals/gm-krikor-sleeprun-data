"use client"

import { useEffect } from "react"

import { PageError } from "@/components/page-error"

// Catches what the list and game boundaries don't, such as a failure in the
// account layouts. The root layout (footer, skip link) stays.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <PageError retry={retry} />
}
