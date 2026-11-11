import { notFound } from "next/navigation"

import { isAccountId } from "@/lib/accounts"

export default async function AccountLayout({ children, params }: LayoutProps<"/[account]">) {
  const { account } = await params
  if (!isAccountId(account)) notFound()

  return <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">{children}</div>
}
