/*
 * Where the mouse was as the last page went (sessionStorage), for the next to put the hand there
 * straight away rather than waiting for the mouse to move.
 */

const PLACE = 'koma.cursor';
/** How long after the last page went that's still taken as where the mouse is (ms). */
const PLACE_FOR = 10_000;

export function savePlace(x: number, y: number): void {
  try {
    sessionStorage.setItem(PLACE, JSON.stringify({ x, y, at: Date.now() }));
  } catch {
    // No storage: the next page shows the hand once the mouse moves.
  }
}

/** Where the mouse was as the last page went, if that was just now (read once). */
export function takePlace(): { x: number; y: number } | null {
  try {
    const place = JSON.parse(sessionStorage.getItem(PLACE) ?? 'null') as { x: number; y: number; at: number } | null;
    sessionStorage.removeItem(PLACE);
    if (place && Date.now() - place.at < PLACE_FOR) return { x: place.x, y: place.y };
  } catch {
    // No storage, or nothing there.
  }
  return null;
}
