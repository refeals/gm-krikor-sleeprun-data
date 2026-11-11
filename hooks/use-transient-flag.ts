"use client"

import { useCallback, useEffect, useState } from "react"

/** A value that clears itself after a delay, for "copied" style feedback. */
export function useTransientValue<T>(durationMs: number) {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    if (value === null) return
    const timer = setTimeout(() => setValue(null), durationMs)
    return () => clearTimeout(timer)
  }, [value, durationMs])

  return [value, setValue] as const
}

/** A flag that turns itself off after a delay. */
export function useTransientFlag(durationMs: number) {
  const [value, setValue] = useTransientValue<true>(durationMs)
  const turnOn = useCallback(() => setValue(true), [setValue])
  return [value === true, turnOn] as const
}
