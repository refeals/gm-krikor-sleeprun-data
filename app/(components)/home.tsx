"use client";

import { Main } from "@/app/(components)/main";
import { Store, useFilteredGames } from "@/app/hooks/useGames";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GithubIcon, YoutubeIcon, GlobeIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const { filter, setFilter } = useFilteredGames();
  const [openingInput, setOpeningInput] = useState(filter.opening);

  useEffect(() => {
    const t = setTimeout(() => setFilter({ opening: openingInput }), 300);
    return () => clearTimeout(t);
  }, [openingInput, setFilter]);

  return (
    <main className="flex h-screen flex-col items-center justify-between px-4 md:px-24 pt-4 md:pt-12 gap-6">
      <h1 className="text-3xl font-bold tracking-wide">Jogos SleepRun</h1>
      <nav className="flex flex-col gap-6 justify-center items-center w-full">
        <div className="flex gap-2 justify-center items-center w-full">
          <Select
            onValueChange={(value: Store["filter"]["year"]) =>
              setFilter({ year: value })
            }
            value={filter.year}
          >
            <SelectTrigger className="max-w-[180px]">
              <SelectValue placeholder="Selecionar ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {Array.from(
                { length: new Date().getFullYear() - 2021 + 1 },
                (_, i) => new Date().getFullYear() - i,
              ).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filtrar por abertura"
            value={openingInput}
            onChange={(e) => setOpeningInput(e.target.value)}
            className="w-[200px]"
          />
        </div>
      </nav>

      <Main />

      <footer className="text-sm pb-6 flex flex-col gap-3 md:flex-row md:gap-20 items-center">
        <div className="flex flex-row gap-6 justify-center">
          <a
            href="https://gmkrikor.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="md:underline flex items-center gap-1.5 justify-center"
          >
            <GlobeIcon className="size-6" />
            <span className="hidden md:inline">Site oficial do GM Krikor</span>
          </a>
          <a
            href="https://www.youtube.com/@GMKrikor"
            target="_blank"
            rel="noopener noreferrer"
            className="md:underline flex items-center gap-1.5 justify-center"
          >
            <YoutubeIcon className="size-6" />
            <span className="hidden md:inline">Youtube</span>
          </a>
          <a
            href="https://github.com/refeals/gm-krikor-sleeprun-data"
            target="_blank"
            rel="noopener noreferrer"
            className="md:underline flex items-center gap-1.5 justify-center"
          >
            <GithubIcon className="size-6" />
            <span className="hidden md:inline">Github</span>
          </a>
        </div>
        <span className="text-center">
          Criado por{" "}
          <a
            href="https://rafaelsiqueira.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Rafael Siqueira
          </a>{" "}
          para toda a comunidade do GM Krikor Mekhitarian
        </span>
      </footer>
    </main>
  );
}
