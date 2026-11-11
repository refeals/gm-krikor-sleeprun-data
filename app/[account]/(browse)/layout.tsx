import { AccountSwitcher } from "@/components/account-switcher"
import { requireAccount } from "@/lib/route-params"

// The header lives in a layout so it stays up in loading.tsx and error.tsx.
// The game page sits outside this group because it has its own header.
export default async function BrowseLayout({ children, params }: LayoutProps<"/[account]">) {
  const account = await requireAccount(params)

  return (
    <>
      <header className="flex flex-col gap-3 pt-4 pb-2 md:pt-8">
        <AccountSwitcher currentId={account.id} />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Jogos do GM Krikor</h1>
          <p className="text-sm text-text-muted">{account.timeControlLabel} no Chess.com</p>
        </div>
      </header>
      <main>{children}</main>
    </>
  )
}
