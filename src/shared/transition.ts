/*
 * Page transitions, in the site's RPG style: a dark panel with a streaked edge wipes across the window
 * left to right, a loading screen shows (a glowing sprite bouncing over "Loading…") while the next
 * page loads, then the panel carries on across and off it, its trailing edge streaked the same way.
 * Going back (the browser's back button, or a game's ← link) runs it right to left. The look is all in
 * transition-head.css; this moves it along.
 *
 * Each page is its own document, so a transition is two halves: this page wipes itself over, fetches
 * the next one while its loading screen shows (for at least LOAD_MS, so that page is ready and doesn't
 * flash in), and says where it's going (sessionStorage); the next page starts under the same loading
 * screen (transition-head.js, before anything is drawn) and this script, loading there, wipes it off.
 * Same-site links go through it on their own; code that sends the browser somewhere calls navigate().
 * Anyone who asked for less motion just gets the page.
 *
 * A page that draws itself once its data is in (from the bot) calls holdReveal() as it starts, and
 * the release it gets back once it has drawn, so the wipe uncovers it with its content rather than
 * empty (the loading screen stays up meanwhile). Never longer than MAX_HOLD_MS.
 */

const KEY = 'koma.transition';
/** The wipe on or off (transition-head.css's animations are this long). */
const WIPE_MS = 800;
/** The loading screen shows at least this long before going, while the next page is fetched. */
const LOAD_MS = 1000;
/** The longest the page being left waits for the next one to be fetched. */
const MAX_FETCH_MS = 2000;
/** The longest the reveal waits for a page to draw itself (holdReveal). */
const MAX_HOLD_MS = 3000;

type Direction = 'forward' | 'back';

interface Pending {
  /** The page it's going to (its path, without a trailing slash). */
  to: string;
  dir: Direction;
  at: number;
}

const root = document.documentElement;
const lessMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** A page's path without its trailing slash (/gear/ and /gear are the same page), as transition-head.js compares them. */
const pagePath = (path: string): string => path.replace(/\/+$/, '');

/** Whether going to `url` gets a transition: another page (a game on another site too, from a game link). */
function goesThrough(url: URL): boolean {
  const to = pagePath(url.pathname);
  if (url.origin === location.origin) return to !== pagePath(location.pathname);
  return /^\/games\/[^/]+$/.test(to);
}

function remember(pending: Pending): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // No storage: this half still plays; the next page just shows up.
  }
}

// ---------------------------------------------------------------------------
// Leaving

let leaving = false;

/** Wipes the loading screen over this page, fetches `url` meanwhile, then goes there. */
async function leave(url: URL, dir: Direction): Promise<void> {
  leaving = true;
  const pending: Pending = { to: pagePath(url.pathname), dir, at: Date.now() };
  remember(pending);
  // The bounce keeps time with the clock (a bounce up and down a second), as the next page's does.
  root.style.setProperty('--tx-phase', `${-(Date.now() % 1000)}ms`);
  root.setAttribute('data-tx-live', '');
  root.setAttribute('data-tx-dir', dir);
  root.setAttribute('data-tx', 'in');
  // Fetched now, so it comes from the cache once the browser goes there. Only this site's pages.
  const fetched =
    url.origin === location.origin
      ? fetch(url.pathname + url.search, { credentials: 'same-origin' }).then(
          () => undefined,
          () => undefined,
        )
      : Promise.resolve();
  await wait(WIPE_MS);
  root.setAttribute('data-tx', 'cover');
  await Promise.all([wait(LOAD_MS), Promise.race([fetched, wait(MAX_FETCH_MS)])]);
  remember({ ...pending, at: Date.now() });
  location.href = url.href;
}

/**
 * Sends the browser to `href`, through a transition when there is one for it. For code that goes
 * somewhere by itself (links go through one on their own). `back` runs it right to left.
 */
export function navigate(href: string, options: { back?: boolean } = {}): void {
  const url = new URL(href, location.href);
  if (leaving) return;
  if (!goesThrough(url) || lessMotion()) {
    location.href = url.href;
    return;
  }
  void leave(url, options.back ? 'back' : 'forward');
}

// Same-site links: a plain left click (not one for a new tab or a download). A game's ← goes back.
document.addEventListener(
  'click',
  (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const href = link.getAttribute('href') ?? '';
    if (href === '' || href.startsWith('#')) return;
    const url = new URL(link.href);
    if (!goesThrough(url) || lessMotion()) return;
    e.preventDefault();
    if (!leaving) void leave(url, link.classList.contains('back') ? 'back' : 'forward');
  },
  // Before the drop-downs' own handlers, which keep their clicks to themselves.
  true,
);

// ---------------------------------------------------------------------------
// Arriving

let holds = 0;
let drawn: () => void = () => {};
/** Done once every hold on the reveal is released. */
const allDrawn = new Promise<void>((resolve) => (drawn = resolve));

/**
 * Keeps this page under the loading screen until it has drawn itself: call it as the page starts,
 * and the function it returns once the page is drawn (or has given up). Calling that again does nothing.
 */
export function holdReveal(): () => void {
  holds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holds === 0) drawn();
  };
}

/** Wipes the loading screen off this page, if it started under it (transition-head.js). */
async function reveal(): Promise<void> {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
  if (!root.hasAttribute('data-tx')) return;
  // Too late (the failsafe has let the page show already): don't cover it again.
  if (performance.now() > 3800) return clear();
  root.setAttribute('data-tx-live', '');
  // The page's own script runs after this one's (it imports it): give it the chance to hold the
  // reveal, then wait for what it holds.
  await wait(0);
  await Promise.race([holds > 0 ? allDrawn : Promise.resolve(), wait(MAX_HOLD_MS)]);
  await wipeOff();
}

async function wipeOff(): Promise<void> {
  root.setAttribute('data-tx', 'out');
  await wait(WIPE_MS);
  clear();
}

function clear(): void {
  for (const name of ['data-tx', 'data-tx-dir', 'data-tx-live']) root.removeAttribute(name);
}

// Back (or forward) to a page the browser kept whole: it would still be under the loading screen as it
// left. It shows up under the panel instead, which wipes off the other way.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  leaving = false;
  if (lessMotion()) return clear();
  root.setAttribute('data-tx-live', '');
  root.setAttribute('data-tx-dir', 'back');
  root.setAttribute('data-tx', 'cover');
  requestAnimationFrame(() => void wipeOff());
});

if (document.body) void reveal();
else document.addEventListener('DOMContentLoaded', () => void reveal(), { once: true });
