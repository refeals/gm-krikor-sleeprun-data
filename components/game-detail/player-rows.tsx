import { PieceSquare } from "@/components/game-marks"
import { formatAccuracy } from "@/lib/format"
import { COLOR_NAME } from "@/lib/game-text"
import type { GameView, PieceColor } from "@/lib/game-view"
import { cn } from "@/lib/utils"

type PlayerRowProps = {
  name: string
  rating?: number
  color: PieceColor
  accuracy: number | null
  barClassName: string
}

function PlayerRow({ name, rating, color, accuracy, barClassName }: PlayerRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <PieceSquare color={color} size="md" />
        <span className="min-w-0 flex-1 truncate text-base font-semibold">
          {name}
          {rating !== undefined ? (
            <span className="text-xs font-medium text-text-muted tabular-nums"> {rating}</span>
          ) : null}
          <span className="sr-only">, {COLOR_NAME[color]}</span>
        </span>
        {accuracy !== null ? (
          <span className="font-display text-lg font-bold tabular-nums">{formatAccuracy(accuracy)}</span>
        ) : null}
      </div>
      {accuracy !== null ? (
        <div aria-hidden className="h-2 rounded-full bg-border">
          <div className={cn("h-2 rounded-full", barClassName)} style={{ width: `${accuracy}%` }} />
        </div>
      ) : null}
    </div>
  )
}

/** Both players, with accuracy bars when the game was analysed. */
export function PlayerRows({ game }: { game: GameView }) {
  const opponentColor: PieceColor = game.color === "white" ? "black" : "white"
  const titleId = `players-${game.uuid}`

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3.5">
      <h2 id={titleId} className="text-sm font-semibold text-text-muted">
        {game.accuracy ? "Precisão" : "Jogadores"}
      </h2>
      <PlayerRow
        name="GM Krikor"
        color={game.color}
        accuracy={game.accuracy?.own ?? null}
        barClassName="bg-accent"
      />
      <PlayerRow
        name={game.opponent.username}
        rating={game.opponent.rating}
        color={opponentColor}
        accuracy={game.accuracy?.opponent ?? null}
        barClassName="bg-opponent-bar"
      />
      {game.accuracy ? null : (
        <p className="text-base text-text-secondary">
          O Chess.com não tem análise de precisão para este jogo.
        </p>
      )}
    </section>
  )
}
