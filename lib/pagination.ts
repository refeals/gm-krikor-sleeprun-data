export type PageItem = number | "gap-start" | "gap-end"

/**
 * 1 … 4 5 6 … 50: first, last, and the current page with one neighbour on
 * each side. A gap that would hide a single page shows that page instead,
 * since "…" takes the same room as the number.
 */
export function getPageItems(currentPage: number, pageCount: number): PageItem[] {
  if (pageCount <= 1) return [1]

  const SIBLINGS = 1
  const start = Math.max(2, currentPage - SIBLINGS)
  const end = Math.min(pageCount - 1, currentPage + SIBLINGS)
  const items: PageItem[] = [1]

  if (start === 3) items.push(2)
  else if (start > 3) items.push("gap-start")
  for (let page = start; page <= end; page++) items.push(page)
  if (end === pageCount - 2) items.push(pageCount - 1)
  else if (end < pageCount - 2) items.push("gap-end")
  items.push(pageCount)

  return items
}
