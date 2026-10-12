/*
 * The rings behind every mark on the databank's way in (./hub.ts): two fine circles with a ring of dots
 * between them, pale and faint, as on a star chart. The mark's own picture goes over them, in gold
 * (public/shared/emblems/, cut to its shape by ./styles/hub.css). Drawn on a 120 by 120 board.
 *
 * The dots' ring is counted as 336 long, so 56 of them, 6 apart, fit it exactly and it can turn with no
 * seam (hub.css slides them along it).
 */
export const EMBLEM_RINGS =
  `<svg class="db-emblem-rings" viewBox="0 0 120 120" aria-hidden="true">` +
  `<circle class="db-emblem-ring" cx="60" cy="60" r="58"/>` +
  `<circle class="db-emblem-ticks" cx="60" cy="60" r="54" pathLength="336" stroke-dasharray="0 6"/>` +
  `<circle class="db-emblem-ring" cx="60" cy="60" r="50"/>` +
  `</svg>`;
