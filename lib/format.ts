import { format, isSameYear } from "date-fns"
import { ptBR } from "date-fns/locale"

const accuracyFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const countFormatter = new Intl.NumberFormat("pt-BR")

const MINUS_SIGN = "−"

/** 93.36 → "93,4%". */
export function formatAccuracy(value: number): string {
  return `${accuracyFormatter.format(value)}%`
}

/** 1234 → "1.234". Ratings are not counts: render them as plain numbers. */
export function formatCount(value: number): string {
  return countFormatter.format(value)
}

/** 8 → "+8", −7 → "−7" (U+2212), 0 → "±0". */
export function formatRatingDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `${MINUS_SIGN}${Math.abs(delta)}`
  return "±0"
}

/** "9 nov" in the current year, "9 nov 2024" otherwise. */
export function formatGameDate(timestamp: number, now = new Date()): string {
  const date = new Date(timestamp)
  return format(date, isSameYear(date, now) ? "d MMM" : "d MMM yyyy", { locale: ptBR })
}

/** "9 nov 2026". */
export function formatFullDate(timestamp: number): string {
  return format(new Date(timestamp), "d MMM yyyy", { locale: ptBR })
}

/** "abril de 2021". */
export function formatMonthYear(timestamp: number): string {
  return format(new Date(timestamp), "MMMM 'de' yyyy", { locale: ptBR })
}

/** "600" → "10+0", "180+2" → "3+2". */
export function formatTimeControl(timeControl: string): string {
  const [baseSeconds, increment = "0"] = timeControl.split("+")
  const minutes = Number(baseSeconds) / 60
  return Number.isFinite(minutes) ? `${minutes}+${increment}` : timeControl
}
