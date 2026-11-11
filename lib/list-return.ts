// Remembers which game the reader opened from the list, so the game page's
// "Jogos" link can go back in history (restoring filters and scroll) instead
// of opening a fresh list. The mark stays until another game is opened from
// the list, so it also works after going back and forward. Session storage
// can be unavailable; then the link simply navigates to the list.

const STORAGE_KEY = "sleeprun:list-return"

export function rememberListReturn(uuid: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, uuid)
  } catch {
    // Storage blocked: the back link falls back to a normal navigation.
  }
}

/** True if the reader reached this game from the list. */
export function cameFromList(uuid: string): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === uuid
  } catch {
    return false
  }
}
