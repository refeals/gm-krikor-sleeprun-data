import { notFound } from "next/navigation"

import { getAccount, isAccountId, type Account } from "@/lib/accounts"

/** The account named in the route, or a 404. */
export async function requireAccount(params: Promise<{ account: string }>): Promise<Account> {
  const { account } = await params
  if (!isAccountId(account)) notFound()
  return getAccount(account)
}
