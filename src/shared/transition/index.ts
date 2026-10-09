/*
 * Page transitions, in the site's RPG style: a dark panel with a streaked edge wipes across the window
 * left to right, a loading screen shows (a glowing sprite bouncing over "Loading…") while the next
 * page loads, then the panel carries on across and off it, its trailing edge streaked the same way.
 * Going back (the browser's back button, or a game's ← link) runs it right to left; catchBack() gives
 * the browser's back button the wipe in a game. The look is all in transition/head.css; this moves it along.
 *
 * Each page is its own document, so a transition is two halves: this page wipes itself over, fetches
 * the next one while its loading screen shows (for at least LOAD_MS, so that page is ready and doesn't
 * flash in), and says where it's going (sessionStorage); the next page starts under the same loading
 * screen (transition/head.js, before anything is drawn) and this script, loading there, wipes it off.
 * Same-site links go through it on their own; code that sends the browser somewhere calls navigate(), or
 * navigateAfter() when it has to ask where first (the loading screen stays up while it does).
 * Anyone who asked for less motion just gets the page.
 *
 * A page that draws itself once its data is in (from the bot) calls holdReveal() as it starts, and
 * the release it gets back once it has drawn, so the wipe uncovers it with its content rather than
 * empty (the loading screen stays up meanwhile). Never longer than MAX_HOLD_MS.
 *
 * The site's own pages are one document (src/site/main.ts): moving between them, back and forward
 * included, the router swaps the page under the same wipe (swap()), and claims their links
 * (onSiteLink()) before the whole-page transition above sees them.
 *
 * Its parts: leaving.ts (this page going: links and navigate()), back.ts (the back button in a game),
 * arriving.ts (the next page uncovered once it has drawn), swap.ts (a site page swapped, and the quick
 * cover), all moving wipe.ts's panel, timed by timing.ts.
 */

import { keepSprite, reveal } from './arriving';
import { catchLinks, page } from './leaving';
import { clear, lessMotion, root, wipeOff } from './wipe';

export { holdReveal } from './arriving';
export { catchBack } from './back';
export { navigate, navigateAfter, onSiteLink } from './leaving';
export { curtain, swap } from './swap';
export type { Direction } from './wipe';

catchLinks();

// Back (or forward) to a page the browser kept whole: it would still be under the loading screen as it
// left. It shows up under the panel instead, which wipes off the other way.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  page.leaving = false;
  if (lessMotion()) return clear();
  keepSprite();
  root.setAttribute('data-tx-live', '');
  root.setAttribute('data-tx-dir', 'back');
  root.setAttribute('data-tx', 'cover');
  requestAnimationFrame(() => void wipeOff());
});

if (document.body) void reveal();
else document.addEventListener('DOMContentLoaded', () => void reveal(), { once: true });
