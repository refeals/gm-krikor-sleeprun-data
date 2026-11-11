// Remembers which game the reader opened from the list, so the game page's
// "Jogos" link can go back in history (restoring filters and scroll) instead
// of opening a fresh list. Session storage can be unavailable; then the link
// simply navigates to the list.

const STORAGE_KEY = "sleeprun:list-return"

export function rememberListReturn(uuid: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, uuid)
  } catch {
    // Storage blocked: the back link falls back to a normal navigation.
  }
}

/** True once if the reader reached this game from the list. */
export function consumeListReturn(uuid: string): boolean {
  try {
    const storedUuid = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    return storedUuid === uuid
  } catch {
    return false
  }
}
