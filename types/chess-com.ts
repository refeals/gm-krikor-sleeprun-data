// Shapes returned by the public Chess.com API (https://api.chess.com/pub/player/...).

export type ChessComPlayer = {
  username: string
  /** Rating after the game ended. */
  rating: number
  /** "win", or how this side lost or drew: "checkmated", "resigned", "agreed"… */
  result: string
  "@id": string
  uuid: string
}

export type ChessComGame = {
  url: string
  pgn: string
  /** Seconds plus increment, e.g. "600" or "180+2". */
  time_control: string
  /** Unix timestamp in seconds. */
  end_time: number
  rated: boolean
  /** Only present when the game was analysed on Chess.com. */
  accuracies?: { white: number; black: number }
  tcn: string
  uuid: string
  initial_setup: string
  fen: string
  time_class: string
  rules: string
  /** Opening page URL, e.g. https://www.chess.com/openings/Queens-Gambit-Accepted. */
  eco?: string
  white: ChessComPlayer
  black: ChessComPlayer
}

export type ChessComArchives = {
  archives: string[]
}

export type ChessComMonth = {
  games: ChessComGame[]
}
