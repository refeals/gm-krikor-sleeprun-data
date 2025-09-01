import { getGames } from "@/fetchers/getGames"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { create } from "zustand"

type Store = {
  filter: string
  page: number
  setFilter: (filter: string) => void
  setPage: (page: number) => void
}

const filterStore = create<Store>((set) => ({
  filter: "2025",
  page: 1,
  setFilter: (filter: string) => set({ filter }),
  setPage: (page: number) => set({ page }),
}))

const useGetGames = () => {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => await getGames(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
}

export const useFilteredGames = () => {
  const { filter, setFilter, page, setPage } = filterStore()
  const { data: games } = useGetGames()

  const query = useQuery({
    queryKey: ["games", filter],
    queryFn: () => {
      if (!games) return []

      return games?.filter((game) => {
        const year = format(game.end_time * 1000, "yyyy")
        return filter === year
      })
    },
  })

  return {
    ...query,
    filter,
    setFilter,
    page,
    setPage,
  }
}
