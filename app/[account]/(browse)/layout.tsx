import { AccountSwitcher } from "@/components/account-switcher"
import { requireAccount } from "@/lib/route-params"

// The header lives in a layout so it stays up in loading.tsx and error.tsx.
// The game page sits outside this group because it has its own header.
export default async function BrowseLayout({ children, params }: LayoutProps<"/[account]">) {
  const account = await requireAccount(params)

  return (
    <>
      {/* DOM order is title, then switcher, which is also the reading order.
          Mobile shows the switcher on top; desktop puts it on the right. */}
      <header className="flex flex-col-reverse gap-3 pt-4 pb-2 md:flex-row md:items-center md:justify-between md:gap-6 md:pt-8">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Jogos do GM Krikor</h1>
          <p className="text-sm text-text-muted">{account.timeControlLabel} no Chess.com</p>
        </div>
        <AccountSwitcher currentId={account.id} />
      </header>
      <main id="main-content" tabIndex={-1} className="focus-visible:outline-none">
        {children}
      </main>
    </>
  )
}
