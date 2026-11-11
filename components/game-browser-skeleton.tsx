import { cn } from "@/lib/utils"

const block = "rounded-control bg-surface"
const SKELETON_CARD_COUNT = 6
const SKELETON_ROW_COUNT = 8
const CHIP_WIDTHS = [72, 92, 92, 96]

/**
 * Placeholder with the list's shape on each layout (cards on mobile, the
 * table from 768px), so nothing jumps when the games arrive. It is also the
 * HTML sent before hydration. The status text is for screen readers only.
 */
export function GameBrowserSkeleton({ isAnnounced = true }: { isAnnounced?: boolean }) {
  return (
    <div aria-busy="true">
      {/* Off when someone else announces the wait, like the account switcher. */}
      {isAnnounced ? (
        <p role="status" className="sr-only">
          Carregando jogos…
        </p>
      ) : null}

      <div aria-hidden className="flex animate-pulse flex-col">
        <div className={cn("hidden h-6 w-[560px] max-w-full md:mb-2 md:block", block)} />

        <div className="flex flex-col gap-3 pt-4 pb-2 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end md:gap-8 md:pt-6">
          <div className={cn("h-11 w-28 md:h-14", block)} />
          <div className={cn("h-16 w-full md:h-24", block)} />
          <div className="flex justify-between gap-4 md:flex-col md:items-end">
            <div className={cn("h-10 w-32", block)} />
            <div className={cn("h-10 w-36", block)} />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:gap-3 md:pt-6">
          <div className="flex gap-2 md:flex-1">
            <div className={cn("h-12 flex-1", block)} />
            <div className={cn("size-12 md:hidden", block)} />
          </div>
          <div className="flex gap-2 py-1">
            {CHIP_WIDTHS.map((width, index) => (
              <div key={index} className="h-11 rounded-full bg-surface" style={{ width }} />
            ))}
          </div>
          <div className="hidden gap-3 md:flex">
            <div className={cn("h-12 w-40", block)} />
            <div className={cn("h-12 w-40", block)} />
          </div>
        </div>

        <div className="flex h-13 items-center justify-between pt-2">
          <div className="h-3.5 w-20 rounded-full bg-surface" />
          <div className="h-3.5 w-28 rounded-full bg-surface" />
        </div>

        <div className="flex flex-col gap-2 pt-1 md:hidden">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-card border border-border-subtle bg-surface p-3"
            >
              <div className="size-11 shrink-0 rounded-control bg-border" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-3/5 rounded-full bg-border" />
                <div className="h-2.5 w-4/5 rounded-full bg-border-subtle" />
                <div className="h-2.5 w-2/5 rounded-full bg-border-subtle" />
              </div>
              <div className="h-4.5 w-11 rounded-full bg-border" />
            </div>
          ))}
        </div>

        <div className="mt-2 hidden overflow-hidden rounded-card border border-border bg-surface md:block">
          <div className="h-12 border-b border-border" />
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <div key={index} className="flex h-[69px] items-center gap-6 border-b border-border-subtle px-4">
              <div className="h-6 w-16 rounded-full bg-border" />
              <div className="h-3 w-40 rounded-full bg-border" />
              <div className="h-3 flex-1 rounded-full bg-border-subtle" />
              <div className="h-3 w-24 rounded-full bg-border-subtle" />
              <div className="h-11 w-48 rounded-control bg-border-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
