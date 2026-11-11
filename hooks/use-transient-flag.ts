"use client"

import { useCallback, useEffect, useState } from "react"

/** A flag that turns itself off after a delay, for "copied" style feedback. */
export function useTransientFlag(durationMs: number) {
  const [isOn, setIsOn] = useState(false)

  useEffect(() => {
    if (!isOn) return
    const timer = setTimeout(() => setIsOn(false), durationMs)
    return () => clearTimeout(timer)
  }, [isOn, durationMs])

  const turnOn = useCallback(() => setIsOn(true), [])

  return [isOn, turnOn] as const
}
