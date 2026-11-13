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

// Board themes the videos use, as light and dark square colors, measured
// on the thumbnails (JPEG shifts them a little from Chess.com's own).
const BOARD_THEMES: readonly { light: Rgb; dark: Rgb }[] = [
  // Green: SleepRun from season 5.
  { light: [236, 238, 210], dark: [118, 152, 86] },
  // Blue: SpeedRuim from season 3.
  { light: [234, 233, 212], dark: [78, 114, 148] },
  // Bright greens: SleepRun season 4.
  { light: [248, 252, 222], dark: [126, 182, 90] },
  { light: [244, 246, 222], dark: [24, 150, 90] },
  // Dark green: SleepRun season 3, SpeedRuim season 2.
  { light: [208, 232, 210], dark: [48, 126, 90] },
  // Olive: early SpeedRuim season 3.
  { light: [236, 246, 200], dark: [138, 164, 102] },
  // Icy blue: season 1 of both.
  { light: [212, 226, 234], dark: [96, 128, 138] },
  // Wood: season 2 of both.
  { light: [240, 198, 152], dark: [174, 114, 70] },
]
type Rgb = readonly [number, number, number]

/** Summed channel difference under which a pixel counts as a square's color. */
const SQUARE_COLOR_TOLERANCE = 40
/** The board fills most of the thumbnail's height; anything smaller isn't it. */
const MIN_BOARD_SHARE = 0.6
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

/** Share of the busiest column of square colors a board column has. */
const BOARD_LINE_SHARE = 0.3
/** Columns below that share a board may have inside it. */
const MAX_LINE_GAP = 2

/**
 * The longest run of columns rich in square colors. Counting by column,
 * rather than taking the outermost pixels, ignores the stray pixels of the
 * same colors in the webcam and the chat.
 */
function findBoardSpan(counts: readonly number[]): { start: number; length: number } {
  const threshold = Math.max(...counts) * BOARD_LINE_SHARE
  let best = { start: 0, length: 0 }
  let start = -1
  let last = -1
  for (let index = 0; index <= counts.length; index++) {
    if (index < counts.length && counts[index] >= threshold) {
      if (start === -1 || index - last > MAX_LINE_GAP + 1) start = index
      last = index
      if (last - start + 1 > best.length) best = { start, length: last - start + 1 }
    }
  }
  return best
}

/**
 * Bounding box of the board inside `frame`, found from the colors of its
 * squares, in whichever theme covers the most pixels. The board sits on the
 * left; the webcam and overlays are on the right.
 */
function findBoard(image: RgbaImage, frame: Rect): Rect | null {
  const searchWidth = Math.floor(frame.width * 0.65)
  const minSize = frame.height * MIN_BOARD_SHARE
  let best: { total: number; columns: number[]; rows: number[] } | null = null
  for (const theme of BOARD_THEMES) {
    const columns = new Array<number>(searchWidth).fill(0)
    const rows = new Array<number>(frame.height).fill(0)
    let total = 0
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < searchWidth; x++) {
        const offset = ((frame.y + y) * image.width + frame.x + x) * 4
        if (isNear(image.data, offset, theme.light) || isNear(image.data, offset, theme.dark)) {
          columns[x]++
          rows[y]++
          total++
        }
      }
    }
    if (!best || total > best.total) best = { total, columns, rows }
  }
  // Empty squares make up at least a third of a board.
  if (!best || best.total < minSize * minSize * 0.3) return null

  const across = findBoardSpan(best.columns)
  const size = across.length
  if (size < minSize || size > frame.height) return null

  // The board is square. Rows can't be counted the same way: a rank full
  // of pieces, as at the start of a game, shows little of its squares. So
  // the board's top is wherever a window of its width holds the most color.
  let window = 0
  for (let y = 0; y < size; y++) window += best.rows[y]
  let top = 0
  let mostColor = window
  for (let y = 1; y + size <= frame.height; y++) {
    window += best.rows[y + size - 1] - best.rows[y - 1]
    if (window > mostColor) {
      mostColor = window
      top = y
    }
  }
  return { x: frame.x + across.start, y: frame.y + top, width: size, height: size }
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
    let piece = board[from]
    if (piece === " ") return null
    if (to > 63) {
      // Promotion: straight ahead, or a capture to either side. Which piece
      // it becomes doesn't matter here, only that it's no longer a pawn.
      const forward = from < 16 ? -8 : 8
      to = from + forward + ((to - 1) % 3) - 1
      piece = piece === "P" ? "Q" : "q"
    }

    const kind = piece.toLowerCase()
    const fromFile = from % 8
    const toFile = to % 8
    const fromRank = Math.floor(from / 8)

    // En passant: a pawn on its fifth rank moving diagonally to an empty
    // square takes the pawn beside it.
    const isFifthRank = piece === "P" ? fromRank === 4 : fromRank === 3
    if (kind === "p" && isFifthRank && fromFile !== toFile && board[to] === " ") {
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

// A frame fits a position when they differ by at most this many squares.
// Missed pieces are allowed more: in small thumbnails a white piece on a
// light square barely shows. A piece where the position has none is rarer:
// a highlighted square, an arrow, a piece mid-drag.
const MAX_MISSED_PIECES = 3
const MAX_EXTRA_PIECES = 2
/** Positions closer than this are too alike to tell two games apart. */
const ALIKE_DISTANCE = 2
/**
 * A square that reads as occupied in this share of a video's frames is an
 * overlay (a watermark over the board), not a piece, and is left out.
 */
const OVERLAY_SHARE = 0.9
/** The starting position is the same from either side, so one pattern finds it. */
const STARTING_OCCUPANCY = replayOccupancy("", true)![0]
/** Start a little before the frame where the game was seen first. */
const LEAD_SECONDS = 10
/**
 * While walking back to a game's start, the longest stretch without a frame
 * that fits it: arrows drawn while explaining, a moment on the webcam alone.
 * A longer one is a break between games.
 */
const MAX_GAP_SECONDS = 40

function distance(a: Occupancy, b: Occupancy): number {
  let different = 0
  for (let index = 0; index < 64; index++) if (a[index] !== b[index]) different++
  return different
}

/** 1 for the squares worth comparing in a video, 0 for its overlay. */
type SquareMask = Uint8Array

function findOverlay(frames: readonly BoardFrame[]): SquareMask {
  const boards = frames.flatMap(({ occupancy }) => (occupancy ? [occupancy] : []))
  const mask = new Uint8Array(64).fill(1)
  for (let index = 0; index < 64; index++) {
    const occupied = boards.reduce((count, board) => count + board[index], 0)
    if (boards.length && occupied >= boards.length * OVERLAY_SHARE) mask[index] = 0
  }
  return mask
}

function fits(frame: Occupancy, position: Occupancy, mask: SquareMask): boolean {
  let missed = 0
  let extra = 0
  for (let index = 0; index < 64; index++) {
    if (!mask[index] || frame[index] === position[index]) continue
    if (frame[index]) extra++
    else missed++
    if (missed > MAX_MISSED_PIECES || extra > MAX_EXTRA_PIECES) return false
  }
  return true
}

function fitsAny(frame: Occupancy, positions: readonly Occupancy[], mask: SquareMask): boolean {
  return positions.some((position) => fits(frame, position, mask))
}

/**
 * When each candidate game starts in the frames, in seconds, for the games
 * the frames show. A frame is evidence for a game when it fits one of the
 * game's own positions and nothing of any other candidate; the game starts
 * where its frames begin, usually on the starting position.
 */
export function findGameStarts(
  frames: readonly BoardFrame[],
  candidates: readonly CandidateGame[],
): Map<string, number> {
  // Positions of each game unlike any of another candidate's.
  const distinctive = candidates.map((candidate) =>
    candidate.positions.filter((position) =>
      candidates.every(
        (other) =>
          other === candidate || other.positions.every((theirs) => distance(position, theirs) > ALIKE_DISTANCE),
      ),
    ),
  )

  const mask = findOverlay(frames)
  // evidence[t]: index of the game frame t can only belong to, or -1.
  const evidence = frames.map(({ occupancy }) => {
    if (!occupancy) return -1
    const owner = distinctive.findIndex((positions) => fitsAny(occupancy, positions, mask))
    if (owner === -1) return -1
    const isShared = candidates.some(
      (other, index) => index !== owner && fitsAny(occupancy, other.positions, mask),
    )
    return isShared ? -1 : owner
  })
  const isStart = frames.map(
    ({ occupancy }) => occupancy !== null && fits(occupancy, STARTING_OCCUPANCY, mask),
  )

  const starts = new Map<string, number>()
  candidates.forEach((candidate, index) => {
    const firstEvidence = evidence.indexOf(index)
    if (firstEvidence === -1) return
    // Back through the frames that still fit this game: its first moves,
    // which other games share, and the starting position. Short stretches
    // that don't fit are crossed; another game's frames stop the walk.
    let startFrame = firstEvidence
    for (let t = firstEvidence - 1; t >= 0; t--) {
      if (frames[startFrame].seconds - frames[t].seconds > MAX_GAP_SECONDS) break
      const { occupancy } = frames[t]
      if (!occupancy) continue
      if (evidence[t] !== -1 && evidence[t] !== index) break
      if (isStart[t] || fitsAny(occupancy, candidate.positions, mask)) startFrame = t
    }
    starts.set(candidate.uuid, Math.max(0, Math.round(frames[startFrame].seconds - LEAD_SECONDS)))
  })
  return starts
}
