/*
 * The marks on the databank's way in (./hub.ts), in gold on a dark disc like a star chart's: a cut gem
 * in a diamond frame for the items, a horned skull for the raid bosses. Drawn on a 120 by 120 board.
 */

/** The gold they're drawn in, lightest at the top; `id` names it (every gradient on a page needs its own). */
const gold = (id: string): string =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8e9b4"/><stop offset="0.55" stop-color="#d8bf7a"/><stop offset="1" stop-color="#a3853f"/></linearGradient></defs>`;

/**
 * The disc every mark sits on: a fine ring, a ring of ticks, and the dark inside them. The ticks' ring is
 * counted as 336 long, so 56 of them fit it exactly and it can turn with no seam (./styles/hub.css).
 */
const disc = (id: string): string =>
  `<circle cx="60" cy="60" r="57" fill="none" stroke="url(#${id})" stroke-width="0.8" opacity="0.6"/>` +
  `<circle class="db-emblem-ticks" cx="60" cy="60" r="52.5" fill="none" stroke="url(#${id})" stroke-width="2.4" pathLength="336" stroke-dasharray="0.8 5.2" opacity="0.7"/>` +
  `<circle cx="60" cy="60" r="48" fill="#0c0b0f" fill-opacity="0.82" stroke="url(#${id})" stroke-width="1.4"/>`;

const DARK = '#15110a';

export const ITEMS_EMBLEM =
  `<svg viewBox="0 0 120 120" aria-hidden="true">${gold('db-gold-items')}${disc('db-gold-items')}` +
  // The frame: a diamond over a square, a spark at each of the diamond's points.
  `<rect x="33" y="33" width="54" height="54" rx="2" fill="none" stroke="url(#db-gold-items)" stroke-width="1.6" opacity="0.75"/>` +
  `<path d="M60 16 104 60 60 104 16 60Z" fill="none" stroke="url(#db-gold-items)" stroke-width="2.6" stroke-linejoin="round"/>` +
  `<path d="M60 7l2.4 6.6L60 20l-2.4-6.4ZM60 100l2.4 6.4L60 113l-2.4-6.6ZM7 60l6.6-2.4L20 60l-6.4 2.4ZM100 60l6.4-2.4L113 60l-6.6 2.4Z" fill="url(#db-gold-items)"/>` +
  // The gem, and its facets.
  `<path d="M40 53 50 41h20l10 12-20 29Z" fill="url(#db-gold-items)"/>` +
  `<path d="M40 53h40M50 41l5 12 5 29M70 41l-5 12-5 29M60 41v12" fill="none" stroke="${DARK}" stroke-width="1.5" stroke-linejoin="round"/>` +
  `</svg>`;

export const BOSSES_EMBLEM =
  `<svg viewBox="0 0 120 120" aria-hidden="true">${gold('db-gold-bosses')}${disc('db-gold-bosses')}` +
  // The horns, curling up and out.
  `<path d="M43 50C28 48 19 37 21 20c5 11 13 17 27 19Z" fill="url(#db-gold-bosses)"/>` +
  `<path d="M77 50c15-2 24-13 22-30-5 11-13 17-27 19Z" fill="url(#db-gold-bosses)"/>` +
  // The skull, down to its jaw.
  `<path d="M60 35c15 0 25 10 25 24 0 8-3 14-8 18v8c0 3-2 5-5 5H48c-3 0-5-2-5-5v-8c-5-4-8-10-8-18 0-14 10-24 25-24Z" fill="url(#db-gold-bosses)"/>` +
  // Its eyes, slanted in; its nose; its teeth.
  `<path d="M43 58l13 5-2 9-9-2ZM77 58l-13 5 2 9 9-2Z" fill="${DARK}"/>` +
  `<path d="M60 71l3.4 8h-6.8Z" fill="${DARK}"/>` +
  `<path d="M50.5 83v7M56.8 84v6M63.2 84v6M69.5 83v7" fill="none" stroke="${DARK}" stroke-width="1.7" stroke-linecap="round"/>` +
  `</svg>`;
