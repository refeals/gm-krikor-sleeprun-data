"use client"

import { SearchX } from "lucide-react"
import { useParams } from "next/navigation"

import { StatusLink, StatusScreen } from "@/components/status-screen"
import { DEFAULT_ACCOUNT_ID, getAccount, isAccountId } from "@/lib/accounts"

// A game id that doesn't exist in this account. The way out is that
// account's list; an unknown account falls back to the default one.
export default function GameNotFound() {
  const { account: accountParam } = useParams<{ account: string }>()
  const account = getAccount(isAccountId(accountParam) ? accountParam : DEFAULT_ACCOUNT_ID)
  const isKnownAccount = isAccountId(accountParam)

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto focus-visible:outline-none md:max-w-[720px]">
      <StatusScreen
        icon={SearchX}
        title="Partida não encontrada"
        description={
          isKnownAccount
            ? `Não há partida com esse endereço na conta ${account.username}.`
            : "Esse endereço não leva a uma conta nem a uma partida."
        }
        actions={<StatusLink href={`/${account.id}`}>Ver jogos da {account.label}</StatusLink>}
      />
    </main>
  )
}
