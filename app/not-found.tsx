import Link from "next/link"

import { DEFAULT_ACCOUNT_ID } from "@/lib/accounts"

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto focus-visible:outline-none flex w-full max-w-[1200px] flex-col items-start gap-4 px-4 pt-16 pb-8 md:px-6"
    >
      <h1 className="font-display text-3xl font-bold md:text-4xl">Página não encontrada</h1>
      <p className="text-base text-text-secondary">
        Esse endereço não leva a uma conta nem a uma partida.
      </p>
      <Link
        href={`/${DEFAULT_ACCOUNT_ID}`}
        className="flex min-h-12 items-center rounded-card bg-accent px-5 text-base font-bold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
      >
        Ver jogos do GM Krikor
      </Link>
    </main>
  )
}
