import { Main } from "@/app/(components)/main"
import { getGames } from "@/fetchers/getGames"
import { SquareArrowOutUpRight } from "lucide-react"

export default async function Home() {
  const gamesData = await getGames()

  return (
    <main className="flex h-screen flex-col items-center justify-between px-4 md:px-24 pt-4 md:pt-12 gap-6">
      <nav className="flex flex-col gap-4 justify-center items-center">
        <h1 className="text-3xl">Jogos SleepRun ({gamesData.length} jogos)</h1>

        <div className="flex gap-6">
          <a
            href="https://www.youtube.com/@GMKrikor"
            target="_blank"
            rel="noopener noreferrer"
            className="underline flex items-center gap-1"
          >
            <SquareArrowOutUpRight className="size-3" /> Youtube
          </a>
          <a
            href="https://github.com/refeals/gm-krikor-sleeprun-data"
            target="_blank"
            rel="noopener noreferrer"
            className="underline flex items-center gap-1"
          >
            <SquareArrowOutUpRight className="size-3" /> Github
          </a>
        </div>
      </nav>

      <Main gamesData={gamesData} />

      <footer className="text-sm pb-6">
        Criado por{" "}
        <a
          href="https://github.com/refeals"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Rafael Siqueira
        </a>{" "}
        para toda a comunidade do GM Krikor Mekhitarian
      </footer>
    </main>
  )
}
