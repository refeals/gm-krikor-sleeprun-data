"use client"

import { Main } from "@/app/(components)/main"
import { useFilteredGames } from "@/app/hooks/useGames"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Github, Youtube } from "lucide-react"

export default function Home() {
  const { filter, setFilter } = useFilteredGames()

  return (
    <main className="flex h-screen flex-col items-center justify-between px-4 md:px-24 pt-4 md:pt-12 gap-6">
      <nav className="flex flex-col gap-4 justify-center items-center">
        <h1 className="text-3xl">Jogos SleepRun</h1>

        <div>
          <Select onValueChange={setFilter} value={filter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
              <SelectItem value="2021">2021</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-6">
          <a
            href="https://www.youtube.com/@GMKrikor"
            target="_blank"
            rel="noopener noreferrer"
            className="underline flex items-center gap-1.5"
          >
            <Youtube className="size-6" /> Youtube
          </a>
          <a
            href="https://github.com/refeals/gm-krikor-sleeprun-data"
            target="_blank"
            rel="noopener noreferrer"
            className="underline flex items-center gap-1.5"
          >
            <Github className="size-6" /> Github
          </a>
        </div>
      </nav>

      <Main />

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
