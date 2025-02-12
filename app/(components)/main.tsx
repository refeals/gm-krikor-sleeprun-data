"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Game } from "@/types/Game"
import { format } from "date-fns"
import { SquareArrowOutUpRight } from "lucide-react"

type Props = {
  gamesData: Game[]
}

const columns: ColumnDef<Game>[] = [
  {
    accessorKey: "players",
    header: "Players",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>
            {row.original.black.username} ({row.original.black.rating})
          </span>
          <span>
            {row.original.white.username} ({row.original.white.rating})
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "result",
    header: "Result",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span>{row.original.white.result === "win" ? 1 : 0}</span>
            <span>{row.original.black.result === "win" ? 1 : 0}</span>
          </div>
          {/* <Plus className="h-4 w-4" /> */}
        </div>
      )
    },
  },
  {
    accessorKey: "accuracies",
    header: "Accuracy",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span>{row.original.accuracies?.white}</span>
          <span>{row.original.accuracies?.black}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "fen",
    header: "Moves",
    cell: ({ row }) => {
      console.log(row.original)
      return <div>{row.original.fen.split(" ").pop()}</div>
    },
  },
  {
    accessorKey: "end_time",
    header: "Date",
    cell: ({ row }) => {
      const end_time = format(
        parseFloat(row.getValue("end_time")) * 1000,
        "dd/MM/yyyy"
      )

      return <div className="font-medium">{end_time}</div>
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            <SquareArrowOutUpRight />
          </a>
        </div>
      )
    },
  },
]

export function Main({ gamesData }: Props) {
  const table = useReactTable({
    data: gamesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border w-full overflow-y-auto">
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
                          header.getContext()
                        )}
                  </TableHead>
                )
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
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
