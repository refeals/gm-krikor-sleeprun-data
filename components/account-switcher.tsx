import Link from "next/link"

import { ACCOUNTS, type AccountId } from "@/lib/accounts"
import { cn } from "@/lib/utils"

export function AccountSwitcher({ currentId }: { currentId: AccountId }) {
  return (
    <nav aria-label="Conta">
      <ul className="grid grid-cols-2 rounded-full border border-border bg-surface p-1 md:inline-grid">
        {ACCOUNTS.map((account) => {
          const isCurrent = account.id === currentId
          return (
            <li key={account.id}>
              <Link
                href={`/${account.id}`}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-full px-5 text-base font-semibold transition-colors",
                  isCurrent
                    ? "bg-accent text-on-accent"
                    : "text-text-secondary hover:text-text",
                )}
              >
                {account.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
