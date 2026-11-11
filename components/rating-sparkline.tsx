"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"

import { formatFullDate } from "@/lib/format"
import type { RatingPoint } from "@/lib/game-stats"

// Room for the 2px line and the 4px end dot with its 2px ring.
const PADDING = 6
const TOOLTIP_HALF_WIDTH = 48

type RatingSparklineProps = {
  points: readonly RatingPoint[]
  label: string
  height: number
}

function nearestIndex(xs: readonly number[], target: number): number {
  let low = 0
  let high = xs.length - 1
  while (low < high) {
    const middle = (low + high) >> 1
    if (xs[middle] < target) low = middle + 1
    else high = middle
  }
  if (low > 0 && target - xs[low - 1] < xs[low] - target) return low - 1
  return low
}

/**
 * Rating over time, one segment per run. The list below is its table view, so
 * the hover readout is a convenience, not the only way to reach a value.
 */
export function RatingSparkline({ points, label, height }: RatingSparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const geometry = useMemo(() => {
    if (width === 0 || points.length === 0) return null

    const firstTime = points[0].endedAt
    const lastTime = points[points.length - 1].endedAt
    const ratings = points.map((point) => point.rating)
    const lowest = Math.min(...ratings)
    const highest = Math.max(...ratings)
    const plotWidth = width - PADDING * 2
    const plotHeight = height - PADDING * 2

    const xs = points.map((point) =>
      lastTime === firstTime
        ? width / 2
        : PADDING + ((point.endedAt - firstTime) / (lastTime - firstTime)) * plotWidth,
    )
    const ys = points.map((point) =>
      highest === lowest
        ? height / 2
        : PADDING + (1 - (point.rating - lowest) / (highest - lowest)) * plotHeight,
    )

    // A new "M" at every run start breaks the line between runs.
    const path = points
      .map((point, index) => {
        const isNewRun = index === 0 || point.runIndex !== points[index - 1].runIndex
        return `${isNewRun ? "M" : "L"}${xs[index].toFixed(1)} ${ys[index].toFixed(1)}`
      })
      .join("")

    return { xs, ys, path }
  }, [points, width, height])

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!geometry) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setActiveIndex(nearestIndex(geometry.xs, event.clientX - bounds.left))
  }

  const lastIndex = points.length - 1
  const activePoint = activeIndex === null ? null : points[activeIndex]
  const activeX = activeIndex === null || !geometry ? 0 : geometry.xs[activeIndex]

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {geometry ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="block touch-pan-y"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
        >
          {activeIndex !== null ? (
            <line
              x1={activeX}
              x2={activeX}
              y1={0}
              y2={height}
              className="stroke-border-strong"
              strokeWidth={1}
            />
          ) : null}
          <path
            d={geometry.path}
            fill="none"
            className="stroke-accent"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={geometry.xs[activeIndex ?? lastIndex]}
            cy={geometry.ys[activeIndex ?? lastIndex]}
            r={4}
            strokeWidth={2}
            className="fill-accent stroke-bg"
          />
        </svg>
      ) : null}

      {activePoint ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-2 flex -translate-x-1/2 -translate-y-full flex-col items-center rounded-control border border-border-strong bg-surface px-2.5 py-1.5 whitespace-nowrap"
          style={{
            left: Math.min(Math.max(activeX, TOOLTIP_HALF_WIDTH), width - TOOLTIP_HALF_WIDTH),
          }}
        >
          <span className="font-display text-base font-bold tabular-nums">{activePoint.rating}</span>
          <span className="text-xs text-text-muted">{formatFullDate(activePoint.endedAt)}</span>
        </div>
      ) : null}
    </div>
  )
}
