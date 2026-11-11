import { formatTimeControl } from "@/lib/format"
import type { ColorFilter, ResultFilter, SortOrder } from "@/lib/game-query"
import type { GameResult, GameView, PieceColor } from "@/lib/game-view"

export const RESULT_FILTER_OPTIONS: readonly { value: ResultFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "win", label: "Vitórias" },
  { value: "draw", label: "Empates" },
  { value: "loss", label: "Derrotas" },
]

/** `label` for chips; `selectLabel` for a select, which shows one option without its group's title. */
export const COLOR_FILTER_OPTIONS: readonly {
  value: ColorFilter
  label: string
  selectLabel: string
}[] = [
  { value: "all", label: "Ambas", selectLabel: "Ambas as cores" },
  { value: "white", label: "Brancas", selectLabel: "Brancas" },
  { value: "black", label: "Pretas", selectLabel: "Pretas" },
]

export const SORT_OPTIONS: readonly { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "accuracy", label: "Maior precisão" },
]

export const RESULT_LABEL: Record<GameResult, string> = {
  win: "Vitória",
  draw: "Empate",
  loss: "Derrota",
}

export const RESULT_LETTER: Record<GameResult, string> = {
  win: "V",
  draw: "E",
  loss: "D",
}

export const COLOR_LABEL: Record<PieceColor, string> = {
  white: "Brancas",
  black: "Pretas",
}

const RESULT_VERB: Record<GameResult, string> = {
  win: "venceu",
  draw: "empatou",
  loss: "perdeu",
}

const COLOR_PHRASE: Record<PieceColor, string> = {
  white: "de brancas",
  black: "de pretas",
}

const TERMINATION_PHRASE: Record<string, string> = {
  checkmated: "por xeque-mate",
  resigned: "por desistência",
  timeout: "no tempo",
  abandoned: "por abandono",
  agreed: "por acordo",
  repetition: "por repetição",
  stalemate: "por afogamento",
  insufficient: "por material insuficiente",
  "50move": "pela regra dos 50 lances",
  timevsinsufficient: "no tempo, com material insuficiente",
}

const TIME_CLASS_LABEL: Record<string, string> = {
  rapid: "Rápida",
  blitz: "Blitz",
  bullet: "Bullet",
  daily: "Diária",
}

export function formatMoveCount(moveCount: number): string {
  return moveCount === 1 ? "1 lance" : `${moveCount} lances`
}

/** "Krikor venceu de brancas por xeque-mate em 42 lances". */
export function describeGame(game: GameView): string {
  const termination = TERMINATION_PHRASE[game.termination]
  return [
    "Krikor",
    RESULT_VERB[game.result],
    COLOR_PHRASE[game.color],
    termination,
    `em ${formatMoveCount(game.moveCount)}`,
  ]
    .filter(Boolean)
    .join(" ")
}

const RULES_LABEL: Record<string, string> = {
  chess960: "Chess960",
  crazyhouse: "Crazyhouse",
  bughouse: "Bughouse",
  kingofthehill: "King of the Hill",
  threecheck: "3 Check",
}

/** "Rápida 10+0", or "Chess960 Blitz 3+0" for a variant. */
export function formatGameFormat(
  game: Pick<GameView, "rules" | "timeClass" | "timeControl">,
): string {
  const label = TIME_CLASS_LABEL[game.timeClass] ?? game.timeClass
  const format = `${label} ${formatTimeControl(game.timeControl)}`
  if (game.rules === "chess") return format
  return `${RULES_LABEL[game.rules] ?? game.rules} ${format}`
}
