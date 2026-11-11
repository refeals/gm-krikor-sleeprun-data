// Remembers which game the reader opened from the list, so the game page's
// "Jogos" link can go back in history (restoring filters and scroll) instead
// of opening a fresh list.
//
// Kept in memory on purpose. It survives client navigations, including back
// and forward, and resets on any full page load. A game reached by a typed
// or shared URL therefore never sends the reader back through history, which
// could leave the site.

let openedFromListUuid: string | null = null

export function rememberListReturn(uuid: string) {
  openedFromListUuid = uuid
}

/** True if the reader reached this game from the list in this page session. */
export function cameFromList(uuid: string): boolean {
  return openedFromListUuid === uuid
}
