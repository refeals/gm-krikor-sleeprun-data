// Dates are shown in Brazil's time zone everywhere. Pages render on servers
// running in UTC, and a game played at 23:00 in São Paulo would otherwise
// show the next day there and a different day on the reader's screen.
export const APP_TIME_ZONE = "America/Sao_Paulo"

const accuracyFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const countFormatter = new Intl.NumberFormat("pt-BR")
const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
})
const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
})
const yearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
})
// en-CA formats dates as YYYY-MM-DD, which works as a day key.
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** U+2212. Typographic minus for negative numbers and the score line. */
export const MINUS_SIGN = "−"

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

/** "2026-11-09": the calendar day of a timestamp in the app time zone. */
export function getDayKeyInAppTimeZone(timestamp: number): string {
  return dayKeyFormatter.format(timestamp)
}

/** Calendar year of a timestamp in the app time zone. */
export function getYearInAppTimeZone(timestamp: number): number {
  return Number(yearFormatter.format(timestamp))
}

function getDateParts(timestamp: number) {
  const parts = dayMonthFormatter.formatToParts(timestamp)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  // pt-BR abbreviations end in a period ("nov."); the design drops it.
  return { day: read("day"), month: read("month").replace(/\.$/, ""), year: read("year") }
}

/** "9 nov 2026". */
export function formatFullDate(timestamp: number): string {
  const { day, month, year } = getDateParts(timestamp)
  return `${day} ${month} ${year}`
}

/** "9 nov" in the current year, "9 nov 2024" otherwise. */
export function formatGameDate(timestamp: number, now = Date.now()): string {
  const { day, month, year } = getDateParts(timestamp)
  return Number(year) === getYearInAppTimeZone(now) ? `${day} ${month}` : `${day} ${month} ${year}`
}

/** "abril de 2021". */
export function formatMonthYear(timestamp: number): string {
  return monthYearFormatter.format(timestamp)
}

/** "600" → "10+0", "180+2" → "3+2". */
export function formatTimeControl(timeControl: string): string {
  const [baseSeconds, increment = "0"] = timeControl.split("+")
  const minutes = Number(baseSeconds) / 60
  return Number.isFinite(minutes) ? `${minutes}+${increment}` : timeControl
}
