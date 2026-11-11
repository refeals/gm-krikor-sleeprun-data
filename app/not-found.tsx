import { SearchX } from "lucide-react"

import { StatusLink, StatusScreen } from "@/components/status-screen"
import { ACCOUNTS } from "@/lib/accounts"

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1200px] px-4 focus-visible:outline-none md:px-6"
    >
      <StatusScreen
        icon={SearchX}
        title="Página não encontrada"
        description="Esse endereço não leva a uma conta nem a uma partida."
        actions={ACCOUNTS.map((account, index) => (
          <StatusLink
            key={account.id}
            href={`/${account.id}`}
            variant={index === 0 ? "primary" : "secondary"}
          >
            Ver jogos da {account.label}
          </StatusLink>
        ))}
      />
    </main>
  )
}
