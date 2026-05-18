"use client";

import { useFilteredGames } from "@/app/hooks/useGames";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Game } from "@/types/Game";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { SquareArrowOutUpRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type PageItem = number | "ellipsis-left" | "ellipsis-right";

function getPaginationItems(
  currentPage: number,
  pageCount: number,
): PageItem[] {
  const siblings = 1;
  const items: PageItem[] = [];

  if (pageCount <= 1) return [1];

  const left = Math.max(2, currentPage - siblings);
  const right = Math.min(pageCount - 1, currentPage + siblings);

  items.push(1);
  if (left > 2) items.push("ellipsis-left");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < pageCount - 1) items.push("ellipsis-right");
  items.push(pageCount);

  return items;
}

const columns: ColumnDef<Game>[] = [
  {
    accessorKey: "players",
    header: "Jogadores",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white" />
            {row.original.white.username} ({row.original.white.rating})
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-black" />
            {row.original.black.username} ({row.original.black.rating})
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "result",
    header: "Resultado",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span>{row.original.white.result === "win" ? 1 : 0}</span>
            <span>{row.original.black.result === "win" ? 1 : 0}</span>
          </div>
          {/* <Plus className="h-4 w-4" /> */}
        </div>
      );
    },
  },
  {
    accessorKey: "accuracies",
    header: "Precisão",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.accuracies?.white}</span>
          <span>{row.original.accuracies?.black}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "fen",
    header: "Movimentos",
    cell: ({ row }) => {
      return <div>{row.original.fen.split(" ").pop()}</div>;
    },
  },
  {
    accessorKey: "end_time",
    header: "Data",
    cell: ({ row }) => {
      const end_time = format(
        parseFloat(row.getValue("end_time")) * 1000,
        "dd/MM/yyyy",
      );

      return <div className="font-medium">{end_time}</div>;
    },
  },
  {
    accessorKey: "eco",
    header: "Abertura",
    cell: ({ row }) => {
      return (
        <div>
          {row.original.eco.split("https://www.chess.com/openings/")[1]}
        </div>
      );
    },
  },
  {
    header: "Ações",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            <SquareArrowOutUpRight className="size-5" />
          </a>
        </div>
      );
    },
  },
];

export function Main() {
  const { data, page, setPage, pageSize, setPageSize } = useFilteredGames();

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      setPage(next.pageIndex + 1);
    },
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalRows = data?.length ?? 0;
  const rowsOnPage = table.getRowModel().rows.length;
  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = (currentPage - 1) * pageSize + rowsOnPage;

  return (
    <div className="rounded-md border w-full flex-1 flex flex-col">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="text-gray-200 font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhum resultado encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="p-4 border-t flex items-center justify-between gap-4 flex-wrap mt-auto">
        <div className="text-sm">
          {totalRows === 0
            ? "0 de 0"
            : `Mostrando ${startRow}-${endRow} de ${totalRows}`}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Linhas por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value: string) => setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pageCount > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Anterior"
                  onClick={(e) => {
                    e.preventDefault();
                    if (table.getCanPreviousPage()) table.previousPage();
                  }}
                  aria-disabled={!table.getCanPreviousPage()}
                  className={
                    !table.getCanPreviousPage()
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
              {getPaginationItems(currentPage, pageCount).map((item, idx) =>
                typeof item === "number" ? (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={`${item}-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Próximo"
                  onClick={(e) => {
                    e.preventDefault();
                    if (table.getCanNextPage()) table.nextPage();
                  }}
                  aria-disabled={!table.getCanNextPage()}
                  className={
                    !table.getCanNextPage()
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
