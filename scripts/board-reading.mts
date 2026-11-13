// Finds where each game starts inside an episode. The video's seek-bar
// thumbnails (scripts/storyboard.mts) show the board every 10 seconds; this
// reads which squares are occupied in each one and matches that against the
// positions of the episode's games, replayed from Chess.com's move list.
//
// Occupancy alone is enough: past the first few moves, two games rarely put
// pieces on the same squares, and the starting position marks a new game.

/** 64 squares as shown on screen, row by row from the top left. 1 is occupied. */
export type Occupancy = Uint8Array

/** Decoded image, 4 bytes per pixel (RGBA). */
export type RgbaImage = { width: number; height: number; data: Uint8Array }

export type Rect = { x: number; y: number; width: number; height: number }

// Board themes the videos use, as light and dark square colors.
const BOARD_THEMES: readonly { light: Rgb; dark: Rgb }[] = [
  // Chess.com "Green": SleepRun.
  { light: [235, 236, 208], dark: [119, 149, 86] },
  // Chess.com "Blue": SpeedRuim.
  { light: [234, 233, 212], dark: [76, 116, 150] },
]
type Rgb = readonly [number, number, number]

/** Summed channel difference under which a pixel counts as a square's color. */
const SQUARE_COLOR_TOLERANCE = 40
/** A board this small in the thumbnail can't be read reliably. */
const MIN_BOARD_SIZE = 120
/** Luminance spread inside a square above which a piece is on it. */
const PIECE_SPREAD = 18

function luminance(data: Uint8Array, offset: number): number {
  return (data[offset] + data[offset + 1] + data[offset + 2]) / 3
}

function isNear(data: Uint8Array, offset: number, color: Rgb): boolean {
  return (
    Math.abs(data[offset] - color[0]) +
      Math.abs(data[offset + 1] - color[1]) +
      Math.abs(data[offset + 2] - color[2]) <
    SQUARE_COLOR_TOLERANCE
  )
}

/** Value at `fraction` of the way through the sorted values. */
function quantile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}

/**
 * Bounding box of the board inside `frame`, found from its square colors.
 * The board sits on the left; the webcam and overlays are on the right.
 */
function findBoard(image: RgbaImage, frame: Rect): Rect | null {
  const searchWidth = Math.floor(frame.width * 0.65)
  for (const theme of BOARD_THEMES) {
    const xs: number[] = []
    const ys: number[] = []
    for (let y = frame.y; y < frame.y + frame.height; y++) {
      for (let x = frame.x; x < frame.x + searchWidth; x++) {
        const offset = (y * image.width + x) * 4
        if (isNear(image.data, offset, theme.light) || isNear(image.data, offset, theme.dark)) {
          xs.push(x)
          ys.push(y)
        }
      }
    }
    if (xs.length < MIN_BOARD_SIZE * MIN_BOARD_SIZE * 0.3) continue

    // Trim stray pixels of the same colors elsewhere in the frame.
    xs.sort((a, b) => a - b)
    ys.sort((a, b) => a - b)
    const left = quantile(xs, 0.005)
    const right = quantile(xs, 0.995)
    const top = quantile(ys, 0.005)
    const bottom = quantile(ys, 0.995)
    const width = right - left + 1
    const height = bottom - top + 1
    if (width < MIN_BOARD_SIZE || height < MIN_BOARD_SIZE) continue
    if (Math.abs(width - height) > 0.1 * width) continue
    return { x: left, y: top, width, height }
  }
  return null
}

/** Which squares hold a piece, or null when the frame shows no board. */
export function readOccupancy(image: RgbaImage, frame: Rect): Occupancy | null {
  const board = findBoard(image, frame)
  if (!board) return null

  const occupancy = new Uint8Array(64)
  const squareWidth = board.width / 8
  const squareHeight = board.height / 8
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      // The middle of the square: its edges blur into the neighbours.
      const x0 = Math.round(board.x + (column + 0.2) * squareWidth)
      const x1 = Math.round(board.x + (column + 0.8) * squareWidth)
      const y0 = Math.round(board.y + (row + 0.2) * squareHeight)
      const y1 = Math.round(board.y + (row + 0.8) * squareHeight)
      let sum = 0
      let sumOfSquares = 0
      let count = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const value = luminance(image.data, (y * image.width + x) * 4)
          sum += value
          sumOfSquares += value * value
          count++
        }
      }
      const mean = sum / count
      const spread = Math.sqrt(Math.max(0, sumOfSquares / count - mean * mean))
      occupancy[row * 8 + column] = spread > PIECE_SPREAD ? 1 : 0
    }
  }
  return occupancy
}

// Moves --------------------------------------------------------------------

// Chess.com's compact move list ("TCN"): two characters per move, each the
// index of a square (a1 = 0, b1 = 1, … h8 = 63). A second character past 63
// is a promotion, encoding the piece and the direction of the pawn's step.
const TCN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++="

const STARTING_BOARD = "RNBQKBNRPPPPPPPP" + " ".repeat(32) + "pppppppprnbqkbnr"

/**
 * Occupancy after each move of a game, from Krikor's side of the board
 * (Chess.com flips it when he has the black pieces). Index 0 is the starting
 * position. Null when the move list can't be read.
 */
export function replayOccupancy(tcn: string, isWhite: boolean): Occupancy[] | null {
  // Pieces by square index; uppercase is white, " " is empty.
  const board = STARTING_BOARD.split("")
  const positions = [toScreen(board, isWhite)]

  for (let index = 0; index + 1 < tcn.length; index += 2) {
    const from = TCN_ALPHABET.indexOf(tcn[index])
    let to = TCN_ALPHABET.indexOf(tcn[index + 1])
    if (from < 0 || from > 63 || to < 0) return null
    if (to > 63) {
      // Promotion: straight ahead, or a capture to either side.
      const forward = from < 16 ? -8 : 8
      to = from + forward + ((to - 1) % 3) - 1
    }

    const piece = board[from]
    if (piece === " ") return null
    const kind = piece.toLowerCase()
    const fromFile = from % 8
    const toFile = to % 8

    // En passant: a pawn moving diagonally to an empty square takes the pawn beside it.
    if (kind === "p" && fromFile !== toFile && board[to] === " ") {
      board[from - fromFile + toFile] = " "
    }
    // Castling: the king moves two squares and the rook jumps over it.
    if (kind === "k" && Math.abs(toFile - fromFile) === 2) {
      const rank = from - fromFile
      const isKingside = toFile > fromFile
      const rookFrom = rank + (isKingside ? 7 : 0)
      const rookTo = rank + (isKingside ? 5 : 3)
      board[rookTo] = board[rookFrom]
      board[rookFrom] = " "
    }
    board[to] = piece
    board[from] = " "
    positions.push(toScreen(board, isWhite))
  }
  return positions
}

function toScreen(board: readonly string[], isWhite: boolean): Occupancy {
  const occupancy = new Uint8Array(64)
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const square = isWhite ? (7 - row) * 8 + column : row * 8 + (7 - column)
      occupancy[row * 8 + column] = board[square] === " " ? 0 : 1
    }
  }
  return occupancy
}

/** Occupancy of a FEN's board, from white's side. Used to check replayOccupancy. */
export function fenOccupancy(fen: string): Occupancy {
  const occupancy = new Uint8Array(64)
  const rows = fen.split(" ")[0].split("/")
  rows.forEach((row, rowIndex) => {
    let column = 0
    for (const char of row) {
      if (/\d/.test(char)) column += Number(char)
      else occupancy[rowIndex * 8 + column++] = 1
    }
  })
  return occupancy
}

// Matching -----------------------------------------------------------------

export type CandidateGame = { uuid: string; positions: Occupancy[] }
export type BoardFrame = { seconds: number; occupancy: Occupancy | null }

/** Squares that may differ between a frame and a position: a piece mid-drag, an arrow. */
const MATCH_DISTANCE = 2
/** The starting position is the same from either side, so one pattern finds it. */
const STARTING_OCCUPANCY = replayOccupancy("", true)![0]
/** Start a little before the frame where the game was seen first. */
const LEAD_SECONDS = 10

function distance(a: Occupancy, b: Occupancy): number {
  let different = 0
  for (let index = 0; index < 64; index++) if (a[index] !== b[index]) different++
  return different
}

function nearestDistance(occupancy: Occupancy, positions: readonly Occupancy[]): number {
  let best = 64
  for (const position of positions) {
    best = Math.min(best, distance(occupancy, position))
    if (best === 0) break
  }
  return best
}

/**
 * When each candidate game starts in the frames, in seconds, for the games
 * the frames show. A frame is evidence for a game when it matches one of its
 * positions that no other candidate comes close to; the game starts at the
 * starting position just before its first evidence.
 */
export function findGameStarts(
  frames: readonly BoardFrame[],
  candidates: readonly CandidateGame[],
): Map<string, number> {
  // Positions of each game that tell it apart from every other candidate.
  const distinctive = candidates.map((candidate) =>
    candidate.positions.filter((position) =>
      candidates.every(
        (other) => other === candidate || nearestDistance(position, other.positions) > MATCH_DISTANCE,
      ),
    ),
  )

  // evidence[t]: index of the game frame t can only belong to, or -1.
  const evidence = frames.map(({ occupancy }) => {
    if (!occupancy) return -1
    const matching = distinctive
      .map((positions, index) => (nearestDistance(occupancy, positions) <= MATCH_DISTANCE ? index : -1))
      .filter((index) => index >= 0)
    return matching.length === 1 ? matching[0] : -1
  })
  const isStart = frames.map(
    ({ occupancy }) => occupancy !== null && distance(occupancy, STARTING_OCCUPANCY) <= 1,
  )

  const starts = new Map<string, number>()
  candidates.forEach((candidate, index) => {
    const firstEvidence = evidence.indexOf(index)
    if (firstEvidence === -1) return
    // Back through the frames that still fit this game: its first moves,
    // which other games share, and the starting position. Frames without a
    // board (the webcam alone) don't stop the walk; another game's do.
    let startFrame = firstEvidence
    for (let t = firstEvidence - 1; t >= 0; t--) {
      const { occupancy } = frames[t]
      if (!occupancy) continue
      if (evidence[t] !== -1 && evidence[t] !== index) break
      if (!isStart[t] && nearestDistance(occupancy, candidate.positions) > MATCH_DISTANCE) break
      startFrame = t
    }
    starts.set(candidate.uuid, Math.max(0, Math.round(frames[startFrame].seconds - LEAD_SECONDS)))
  })
  return starts
}
