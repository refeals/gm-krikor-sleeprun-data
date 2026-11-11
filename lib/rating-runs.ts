// Shared by the app and the scripts, so it imports nothing.

// The largest legitimate single-game change seen in the data is +130, while
// still provisional. Resets are drops of about 2000 points.
const RUN_RESET_THRESHOLD = 300

/**
 * The rating was reset between two games in the same pool: a new speedrun
 * started. Only the size of the jump counts. A sign that contradicts the
 * result is legitimate: a fair-play rating refund can land between games.
 */
export function isRunReset(previousRating: number, rating: number): boolean {
  return Math.abs(rating - previousRating) > RUN_RESET_THRESHOLD
}
