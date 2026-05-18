import { getGames } from "@/fetchers/getGames";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { create } from "zustand";

export type Store = {
  filter: {
    year: string | "all";
    opening: string;
  };
  page: number;
  pageSize: number;
  setFilter: (filter: Partial<Store["filter"]>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

const filterStore = create<Store>((set) => ({
  filter: { year: "all", opening: "" },
  page: 1,
  pageSize: 25,
  setFilter: (partial) =>
    set((state) => ({
      filter: { ...state.filter, ...partial },
      page: 1,
    })),
  setPage: (page: number) => set({ page }),
  setPageSize: (pageSize: number) => set({ pageSize, page: 1 }),
}));

const useGetGames = () => {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => await getGames(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });
};

export const useFilteredGames = () => {
  const { filter, setFilter, page, setPage, pageSize, setPageSize } =
    filterStore();
  const { data: games } = useGetGames();

  const filteredGames = useMemo(() => {
    if (!games) return [];

    return games.filter((game) => {
      const gameYear = format(new Date(game.end_time * 1000), "yyyy");
      const matchesYear = filter.year === "all" || gameYear === filter.year;

      const openingName =
        game.eco.split("/").pop()?.replace(/-/g, " ").toLowerCase() ?? "";
      const matchesOpening =
        !filter.opening || openingName.includes(filter.opening.toLowerCase());

      return matchesYear && matchesOpening;
    });
  }, [games, filter]);

  return {
    data: filteredGames,
    filter,
    setFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
  };
};
