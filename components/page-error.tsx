"use client"

import { TriangleAlert } from "lucide-react"

import { StatusButton, StatusLink, StatusScreen } from "@/components/status-screen"
import { DEFAULT_ACCOUNT_ID } from "@/lib/accounts"

/**
 * Failure outside the game list (the list and the game page have their own
 * screens about Chess.com). Used by app/error.tsx and app/global-error.tsx.
 */
export function PageError({ retry }: { retry: () => void }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1200px] px-4 focus-visible:outline-none md:px-6"
    >
      <StatusScreen
        role="alert"
        icon={TriangleAlert}
        title="Não foi possível abrir esta página"
        description="Tente de novo. Se o erro continuar, comece pela lista de jogos."
        actions={
          <>
            <StatusButton onClick={retry}>Tentar de novo</StatusButton>
            <StatusLink variant="secondary" href={`/${DEFAULT_ACCOUNT_ID}`}>
              Ver jogos do GM Krikor
            </StatusLink>
          </>
        }
      />
    </main>
  )
}
