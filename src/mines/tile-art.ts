/** What a tile turns over to show: a gem or a mine. */

/**
 * A gem like the bot's :komatreasure:: facets split by gaps (the open tile's colour), each in its own
 * pastel iridescent gradient (in the page once, see GEM_GRADIENTS). It shimmers too (mines.css).
 */
export const GEM_SVG =
  '<svg class="mx-gem" viewBox="0 0 64 64" aria-hidden="true"><g style="stroke:var(--bg)" stroke-width="2.6" stroke-linejoin="round">' +
  '<path fill="url(#mx-ir-1)" d="M4 24 14 10l9 14z"/><path fill="url(#mx-ir-2)" d="M14 10h18l-9 14z"/><path fill="url(#mx-ir-3)" d="M23 24l9-14 9 14z"/>' +
  '<path fill="url(#mx-ir-4)" d="M32 10h18l-9 14z"/><path fill="url(#mx-ir-5)" d="M41 24l9-14 10 14z"/>' +
  '<path fill="url(#mx-ir-6)" d="M4 24h19l9 34z"/><path fill="url(#mx-ir-7)" d="M23 24h18l-9 34z"/><path fill="url(#mx-ir-8)" d="M41 24h19L32 58z"/></g></svg>';

/** Each facet's gradient: which way it runs (x1 y1 x2 y2, across the facet) and its colours. */
const GEM_GRADIENTS: [string, string[]][] = [
  ['0 1 1 0', ['#8fd8ff', '#b99bff']],
  ['0 0 1 1', ['#c49bff', '#ff9bd6']],
  ['0 1 1 0', ['#ff9fd0', '#ffc79a']],
  ['0 0 1 1', ['#ff9bd6', '#ffd39a']],
  ['0 0 1 1', ['#ffd39a', '#d4f59a']],
  ['0 0 1 1', ['#a99bff', '#ff9fd6']],
  ['0 0 .4 1', ['#ff9fcf', '#ffc58f', '#f7ef8f']],
  ['0 0 1 1', ['#fbe98f', '#bdf59a', '#8ff0c8']],
];

/** Puts the gem's gradients in the page, once (every gem on the board points at them). */
export function installGemGradients(): void {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${GEM_GRADIENTS.map(([dir, colors], k) => {
      const [x1, y1, x2, y2] = dir.split(' ');
      const stops = colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('');
      return `<linearGradient id="mx-ir-${k + 1}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
    }).join('')}</defs></svg>`,
  );
}

export const MINE_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="30" cy="36" r="22" fill="#e9113c"/><circle cx="23" cy="29" r="6" fill="#ff8aa0" opacity=".7"/><path d="M44 18l6-6" stroke="#b30b2b" stroke-width="5" stroke-linecap="round"/><path d="M50 12l4-2M52 16l5 1M48 8l1-5" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/></svg>';
