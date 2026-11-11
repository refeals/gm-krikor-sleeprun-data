"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useOptimistic, type MouseEvent } from "react"

import { ACCOUNTS, getAccount, type AccountId } from "@/lib/accounts"
import { cn } from "@/lib/utils"

/**
 * List header with the account switcher. Switching is optimistic: the chosen
 * account lights up and the format line changes on the click, while the
 * navigation runs in a transition. `data-pending` on the header lets the
 * layout swap the list for a skeleton with CSS until the new account arrives.
 *
 * The other account's games (~850 KB) only load on click: with loading.tsx in
 * the segment, Next.js prefetches no more than the layout, and measured
 * nothing at all for this route, so the wait needs its own feedback.
 */
export function AccountHeader({ currentId }: { currentId: AccountId }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useOptimistic(currentId)
  const [isPending, setIsPending] = useOptimistic(false)
  const selected = getAccount(selectedId)

  function handleClick(event: MouseEvent<HTMLAnchorElement>, accountId: AccountId) {
    const opensElsewhere =
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (opensElsewhere) return
    event.preventDefault()
    if (accountId === selectedId) return

    startTransition(() => {
      setSelectedId(accountId)
      setIsPending(true)
      router.push(`/${accountId}`)
    })
  }

  return (
    // DOM order is title, then switcher, which is also the reading order.
    // Mobile shows the switcher on top; desktop puts it on the right.
    <header
      data-pending={isPending ? "" : undefined}
      className="flex flex-col-reverse gap-3 pt-4 pb-2 md:flex-row md:items-center md:justify-between md:gap-6 md:pt-8"
    >
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Jogos do GM Krikor</h1>
        <p className="text-sm text-text-muted">{selected.timeControlLabel} no Chess.com</p>
      </div>

      <nav aria-label="Conta" aria-busy={isPending}>
        <ul className="grid grid-cols-2 rounded-full border border-border bg-surface p-1 md:inline-grid">
          {ACCOUNTS.map((account) => {
            const isSelected = account.id === selectedId
            return (
              <li key={account.id}>
                <Link
                  href={`/${account.id}`}
                  onClick={(event) => handleClick(event, account.id)}
                  aria-current={account.id === currentId ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center justify-center rounded-full px-5 text-base font-semibold transition-colors duration-150",
                    isSelected ? "bg-accent text-on-accent" : "text-text-secondary hover:text-text active:bg-surface-pressed",
                  )}
                >
                  {account.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <p role="status" className="sr-only">
        {isPending ? `Carregando jogos da ${selected.label}…` : ""}
      </p>
    </header>
  )
}
