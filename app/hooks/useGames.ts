import { getGames } from "@/fetchers/getGames";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { create } from "zustand";

export type Account = "sleeprerun" | "speedbemruim";

export const ACCOUNTS: { value: Account; label: string }[] = [
  { value: "sleeprerun", label: "SleepRun" },
  { value: "speedbemruim", label: "SpeedBemRuim" },
];

export type Store = {
  account: Account;
  filter: {
    year: string | "all";
    opening: string;
  };
  page: number;
  pageSize: number;
  setAccount: (account: Account) => void;
  setFilter: (filter: Partial<Store["filter"]>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

const filterStore = create<Store>((set) => ({
  account: "sleeprerun",
  filter: { year: "all", opening: "" },
  page: 1,
  pageSize: 25,
  setAccount: (account) =>
    set({ account, filter: { year: "all", opening: "" }, page: 1 }),
  setFilter: (partial) =>
    set((state) => ({
      filter: { ...state.filter, ...partial },
      page: 1,
    })),
  setPage: (page: number) => set({ page }),
  setPageSize: (pageSize: number) => set({ pageSize, page: 1 }),
}));

const useGetGames = (account: Account) => {
  return useQuery({
    queryKey: ["games", account],
    queryFn: async () => await getGames(account),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });
};

export const useFilteredGames = () => {
  const {
    account,
    filter,
    setAccount,
    setFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = filterStore();
  const { data: games } = useGetGames(account);

  const availableYears = useMemo(() => {
    if (!games || games.length === 0) return [];
    const years = new Set<number>();
    for (const game of games) {
      years.add(new Date(game.end_time * 1000).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [games]);

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
    account,
    setAccount,
    availableYears,
    filter,
    setFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
  };
};
