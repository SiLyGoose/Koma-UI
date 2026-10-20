import './back.css';

/*
 * King's Raid's back arrow (back.css): a thick arrow, silver-white fading to grey down it, in a dark edge with a light
 * line inside. It is drawn on a button already in the page; where it goes back to, and what it is called for a screen
 * reader (aria-label), are its page's.
 */

/** The drawing. */
const ARROW = `<svg viewBox="0 0 64 44" aria-hidden="true">
  <defs><linearGradient id="kr-back-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#e4e4e4"/><stop offset="1" stop-color="#9a9a9a"/></linearGradient></defs>
  <path d="M4 22 L26 3 L26 13 L60 13 L60 31 L26 31 L26 41 Z" fill="url(#kr-back-fill)" stroke="#2a2118" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M10 22 L23 10.5 L23 16 L57 16" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

/** Draws `el` as King's Raid's back arrow, in place of whatever it held. */
export function backArrow<T extends HTMLElement>(el: T): T {
  el.classList.add('kr-back');
  el.innerHTML = ARROW;
  return el;
}
