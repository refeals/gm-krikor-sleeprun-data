import { AccountHeader } from "@/components/account-header"
import { GameBrowserSkeleton } from "@/components/game-browser-skeleton"
import { requireAccount } from "@/lib/route-params"

// The header lives in a layout so it stays up in loading.tsx and error.tsx.
// The game page sits outside this group because it has its own header.
export default async function BrowseLayout({ children, params }: LayoutProps<"/[account]">) {
  const account = await requireAccount(params)

  return (
    // While the header reports a pending account switch (data-pending), the
    // list is swapped for its skeleton. CSS only; the header announces it.
    <div className="group">
      <AccountHeader currentId={account.id} />
      <main id="main-content" tabIndex={-1} className="focus-visible:outline-none">
        <div className="group-has-data-pending:hidden">{children}</div>
        <div className="hidden group-has-data-pending:block">
          <GameBrowserSkeleton isAnnounced={false} />
        </div>
      </main>
    </div>
  )
}
