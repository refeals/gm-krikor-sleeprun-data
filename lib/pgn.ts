// Shared by the app and the scripts, so it imports nothing.

/** Highest move number in the PGN movetext. The FEN often lacks move counters. */
export function countMoves(pgn: string): number {
  const movetext = pgn
    .replace(/^\[.*\]\s*$/gm, "")
    .replace(/\{[^}]*\}/g, "")
  let highest = 0
  for (const match of movetext.matchAll(/(\d+)\./g)) {
    highest = Math.max(highest, Number(match[1]))
  }
  return highest
}

/** Value of a PGN header such as `[EndTime "12:42:02"]`. */
export function readPgnHeader(pgn: string, name: string): string | null {
  return pgn.match(new RegExp(`^\\[${name} "([^"]*)"\\]$`, "m"))?.[1] ?? null
}
