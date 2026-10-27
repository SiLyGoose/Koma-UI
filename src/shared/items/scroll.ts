import { el } from './items';

/*
 * The Transcendence Scroll: crafted from any one boss's Boss Crystals (the inventory's Craft tab), held in Others, and used
 * on a hero in its Transcend tab, each giving it TP_SCROLL_POINTS more TP (the bot's protocol/heroes.ts). King's Raid has no
 * such item, so its picture is drawn here: a scroll with the heroes page's TP badge on it.
 */

export const SCROLL_NAME = 'Transcendence Scroll';

/** So many scrolls, in a few words: "1 Transcendence Scroll", "3 Transcendence Scrolls". */
export const scrollCount = (count: number): string => `${count.toLocaleString('en-US')} ${SCROLL_NAME}${count === 1 ? '' : 's'}`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="p" x1="0" x2="1"><stop offset="0" stop-color="#e6cf9c"/><stop offset=".5" stop-color="#f8ecc9"/><stop offset="1" stop-color="#d9bc84"/></linearGradient>
<linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#7a4a20"/><stop offset=".5" stop-color="#c88b4a"/><stop offset="1" stop-color="#6e421b"/></linearGradient>
<radialGradient id="o" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#7cc4f2"/><stop offset="1" stop-color="#1f5a9c"/></radialGradient>
</defs>
<rect x="14" y="10" width="36" height="44" fill="url(#p)" stroke="#a07a43" stroke-width="1.5"/>
<rect x="10" y="5" width="44" height="9" rx="4.5" fill="url(#r)" stroke="#4f3010" stroke-width="1.2"/>
<rect x="10" y="50" width="44" height="9" rx="4.5" fill="url(#r)" stroke="#4f3010" stroke-width="1.2"/>
<circle cx="32" cy="32" r="13.5" fill="url(#o)" stroke="#b8d8f5" stroke-width="2"/>
<text x="32" y="29.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="8" fill="#fff">TP</text>
<text x="32" y="40.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="11" fill="#fff">+5</text>
</svg>`;

const SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`;

/** The scroll's picture as an <img> (`className` its class); `named`: named for the reader, to stand beside a number. */
export function scrollPicture(className = '', named = false): HTMLImageElement {
  const img = el('img', className);
  img.src = SRC;
  img.alt = named ? `${SCROLL_NAME}s` : '';
  if (named) img.title = `${SCROLL_NAME}s`;
  img.draggable = false;
  return img;
}
