import type { GameResult, GameView, PieceColor } from "@/lib/game-view"

export type ResultFilter = GameResult | "all"
export type ColorFilter = PieceColor | "all"
export type SortOrder = "newest" | "oldest" | "accuracy"

/** List state kept in the URL. Keys match the query string. */
export type GameQuery = {
  q: string
  result: ResultFilter
  color: ColorFilter
  year: number | null
  sort: SortOrder
  page: number
  size: number
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const LOAD_MORE_BATCH = 25

export const DEFAULT_GAME_QUERY: GameQuery = {
  q: "",
  result: "all",
  color: "all",
  year: null,
  sort: "newest",
  page: 1,
  size: 25,
}

const RESULT_FILTERS: readonly ResultFilter[] = ["all", "win", "draw", "loss"]
const COLOR_FILTERS: readonly ColorFilter[] = ["all", "white", "black"]
const SORT_ORDERS: readonly SortOrder[] = ["newest", "oldest", "accuracy"]

type SearchParamsLike = { get(name: string): string | null }

function pickOption<T extends string>(
  value: string | null,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return parsed > 0 ? parsed : null
}

export function parseGameQuery(params: SearchParamsLike): GameQuery {
  const size = parsePositiveInteger(params.get("size"))
  return {
    q: params.get("q")?.trim() ?? "",
    result: pickOption(params.get("result"), RESULT_FILTERS, "all"),
    color: pickOption(params.get("color"), COLOR_FILTERS, "all"),
    year: parsePositiveInteger(params.get("year")),
    sort: pickOption(params.get("sort"), SORT_ORDERS, "newest"),
    page: parsePositiveInteger(params.get("page")) ?? 1,
    size: PAGE_SIZE_OPTIONS.find((option) => option === size) ?? DEFAULT_GAME_QUERY.size,
  }
}

/** Query string with a leading "?", or "" when everything is at its default. */
export function serializeGameQuery(query: GameQuery): string {
  const params = new URLSearchParams()
  const q = query.q.trim()
  if (q) params.set("q", q)
  if (query.result !== "all") params.set("result", query.result)
  if (query.color !== "all") params.set("color", query.color)
  if (query.year !== null) params.set("year", String(query.year))
  if (query.sort !== DEFAULT_GAME_QUERY.sort) params.set("sort", query.sort)
  if (query.page > 1) params.set("page", String(query.page))
  if (query.size !== DEFAULT_GAME_QUERY.size) params.set("size", String(query.size))
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

/** Lowercase, without accents, so "defesa" finds "Défense" and "caro" finds "Caro". */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

export type GameFilters = Pick<GameQuery, "q" | "result" | "color" | "year">

export function filterGames(games: readonly GameView[], filters: GameFilters): GameView[] {
  const term = normalizeSearchText(filters.q)
  return games.filter((game) => {
    if (filters.result !== "all" && game.result !== filters.result) return false
    if (filters.color !== "all" && game.color !== filters.color) return false
    if (filters.year !== null && game.year !== filters.year) return false
    if (!term) return true
    return (
      normalizeSearchText(game.opponent.username).includes(term) ||
      normalizeSearchText(game.openingName ?? "").includes(term)
    )
  })
}

export function sortGames(games: readonly GameView[], sort: SortOrder): GameView[] {
  const sorted = [...games]
  if (sort === "oldest") return sorted.sort((a, b) => a.endedAt - b.endedAt)
  if (sort === "accuracy") {
    // Games without analysis go last; ties fall back to the newest first.
    return sorted.sort(
      (a, b) =>
        (b.accuracy?.own ?? -1) - (a.accuracy?.own ?? -1) || b.endedAt - a.endedAt,
    )
  }
  return sorted.sort((a, b) => b.endedAt - a.endedAt)
}

/** Years with at least one game, newest first. */
export function getAvailableYears(games: readonly GameView[]): number[] {
  return [...new Set(games.map((game) => game.year))].sort((a, b) => b - a)
}

/** Filters that live in the filter sheet (the result chips are outside it). */
export function countSheetFilters(query: GameQuery): number {
  return Number(query.color !== "all") + Number(query.year !== null)
}

/** Clears what narrows the list. Sort order and page size are not filters. */
export const CLEARED_FILTERS: GameFilters = { q: "", result: "all", color: "all", year: null }
