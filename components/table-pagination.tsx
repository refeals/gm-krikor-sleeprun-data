import { ChevronLeft, ChevronRight } from "lucide-react"

import { SelectField } from "@/components/select-field"
import { formatCount } from "@/lib/format"
import { PAGE_SIZE_OPTIONS } from "@/lib/game-query"
import { getPageItems } from "@/lib/pagination"
import { cn } from "@/lib/utils"

type TablePaginationProps = {
  currentPage: number
  pageCount: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const pageButtonClassName =
  "flex size-11 items-center justify-center rounded-control text-base font-semibold tabular-nums transition-colors duration-150 active:bg-surface-pressed"

export function TablePagination({
  currentPage,
  pageCount,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const firstShown = (currentPage - 1) * pageSize + 1
  const lastShown = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
      <p className="text-sm text-text-muted tabular-nums">
        Mostrando {formatCount(firstShown)}–{formatCount(lastShown)} de {formatCount(totalCount)}
      </p>

      <SelectField
        label="Linhas por página"
        isLabelVisible
        value={String(pageSize)}
        options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
        onChange={(value) => onPageSizeChange(Number(value))}
      />

      {pageCount > 1 ? (
        <nav aria-label="Paginação">
          <ul className="flex items-center gap-2">
            <li>
              <button
                type="button"
                aria-label="Página anterior"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className={cn(pageButtonClassName, "hover:bg-surface disabled:text-disabled disabled:hover:bg-transparent")}
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
            </li>
            {getPageItems(currentPage, pageCount).map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <button
                    type="button"
                    aria-label={`Página ${item}`}
                    aria-current={item === currentPage ? "page" : undefined}
                    onClick={() => onPageChange(item)}
                    className={cn(
                      pageButtonClassName,
                      item === currentPage ? "bg-accent text-on-accent" : "hover:bg-surface",
                    )}
                  >
                    {item}
                  </button>
                </li>
              ) : (
                <li key={item} aria-hidden className="flex size-11 items-center justify-center text-text-muted">
                  …
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={currentPage === pageCount}
                onClick={() => onPageChange(currentPage + 1)}
                className={cn(pageButtonClassName, "hover:bg-surface disabled:text-disabled disabled:hover:bg-transparent")}
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
