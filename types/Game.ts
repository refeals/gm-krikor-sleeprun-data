export type Game = {
  url: string
  pgn: string
  time_control: string
  end_time: number
  rated: true
  accuracies: { white: number; black: number }
  tcn: string
  uuid: string
  initial_setup: string
  fen: string
  time_class: string
  rules: string
  white: {
    rating: number
    result: string
    "@id": string
    username: string
    uuid: string
  }
  black: {
    rating: number
    result: string
    "@id": string
    username: string
    uuid: string
  }
  eco: string
}
