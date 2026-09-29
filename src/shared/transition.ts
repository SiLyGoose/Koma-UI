/*
 * Page transitions, in the site's RPG style: a dark panel with a streaked edge wipes across the window
 * left to right, a loading screen shows (a glowing sprite bouncing over "Loading…") while the next
 * page loads, then the panel carries on across and off it, its trailing edge streaked the same way.
 * Going back (the browser's back button, or a game's ← link) runs it right to left; catchBack() gives
 * the browser's back button the wipe in a game. The look is all in transition-head.css; this moves it along.
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
 *
 * The site's own pages are one document (src/site/main.ts): moving between them, back and forward
 * included, the router swaps the page under the same wipe (swap()), and claims their links
 * (onSiteLink()) before the whole-page transition above sees them.
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
/** Swapping a site page, the loading screen shows at least this long, so it doesn't just flicker. */
const MIN_SWAP_MS = 300;
/** The quick cover's wipe on or off (curtain(): transition-head.css's at twice the speed). */
const FAST_WIPE_MS = 400;

export type Direction = 'forward' | 'back';


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

/**
 * The browser's back button, run through the wipe (right to left) as the page's own ← is, for a page
 * that is its own document (a game). Going back to another document happens at once, before any script
 * gets a say, so this puts a second history entry for this same page on top of the one it arrived at:
 * back then only steps down to that one (a popstate, here), and the wipe covers the page before going
 * back for real. With nothing to go back to (a game opened in a new tab), it goes to `fallback`.
 *
 * The entry is added on the member's first click or key press: browsers skip over entries a page adds
 * before anyone has touched it, which would send back past this page with no wipe (as it was before).
 */
export function catchBack(fallback: string): void {
  const TRAP = 'koma.backTrap';
  const trapped = (state: unknown): boolean => (state as Record<string, unknown> | null)?.[TRAP] === true;

  const arm = (): void => {
    removeEventListener('click', arm, true);
    removeEventListener('keydown', arm, true);
    if (!trapped(history.state)) history.pushState({ ...history.state, [TRAP]: true }, '');
  };
  const armOnTouch = (): void => {
    // Arrived back on the entry on top (forward, or back from a page gone to with ←): it's in place already.
    if (trapped(history.state)) return;
    addEventListener('click', arm, true);
    addEventListener('keydown', arm, true);
  };
  armOnTouch();
  // Shown again from the browser's cache (forward, onto the entry it arrived at): again.
  addEventListener('pageshow', (e) => {
    if (e.persisted) armOnTouch();
  });

  let fallbackTimer = 0;
  // Gone (back for real): don't fall back when this page is shown again from the browser's cache.
  addEventListener('pagehide', () => clearTimeout(fallbackTimer));

  const goBack = (): void => {
    history.back();
    // Still here after a moment: there was nothing before this page.
    fallbackTimer = window.setTimeout(() => location.replace(new URL(fallback, location.href).href), 400);
  };

  addEventListener('popstate', async (e) => {
    // Forward onto the entry on top again: nothing to do.
    if (trapped(e.state) || leaving) return;
    leaving = true;
    if (lessMotion()) return goBack();
    root.style.setProperty('--tx-phase', `${-(Date.now() % 1000)}ms`);
    root.setAttribute('data-tx-live', '');
    root.setAttribute('data-tx-dir', 'back');
    root.setAttribute('data-tx', 'in');
    await wait(WIPE_MS);
    root.setAttribute('data-tx', 'cover');
    // The page gone back to starts under the loading screen and wipes it off right to left
    // (transition-head.js for a page loaded afresh, the pageshow listener below for one the browser kept).
    goBack();
  });
}

/** Claims a link to one of this document's own pages (the router); true when it did. */
let siteLink: ((url: URL, link: HTMLAnchorElement) => boolean) | null = null;

/** The router takes the links to its pages: `handler` goes there itself and says true, or says false. */
export function onSiteLink(handler: (url: URL, link: HTMLAnchorElement) => boolean): void {
  siteLink = handler;
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
    if (siteLink?.(url, link)) {
      e.preventDefault();
      return;
    }
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
/** Waiting for every hold to be released. */
let waiting: (() => void)[] = [];

/** Done once nothing holds the reveal (at once when nothing does). */
function drawn(): Promise<void> {
  if (holds === 0) return Promise.resolve();
  return new Promise((resolve) => waiting.push(resolve));
}

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
    if (--holds > 0) return;
    for (const resolve of waiting) resolve();
    waiting = [];
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
  await Promise.race([drawn(), wait(MAX_HOLD_MS)]);
  await wipeOff();
}

// ---------------------------------------------------------------------------
// Swapping a site page in place (src/site/main.ts)

let swapping = false;
/** The swap asked for while one was running: only the latest is kept, and runs once that one is done. */
let queued: { dir: Direction; change: () => void | Promise<void> } | null = null;

/**
 * Wipes the loading screen on, runs `change` under it (the router swapping the page), waits for the new
 * page to draw itself (holdReveal), and wipes it off. `back` runs it right to left. Without the motion,
 * just `change`.
 */
export async function swap(dir: Direction, change: () => void | Promise<void>): Promise<void> {
  if (lessMotion()) return change();
  if (swapping) {
    queued = { dir, change };
    return;
  }
  swapping = true;
  root.style.setProperty('--tx-phase', `${-(Date.now() % 1000)}ms`);
  root.setAttribute('data-tx-live', '');
  root.setAttribute('data-tx-dir', dir);
  root.setAttribute('data-tx', 'in');
  await wait(WIPE_MS);
  root.setAttribute('data-tx', 'cover');
  try {
    await change();
  } finally {
    await Promise.all([wait(MIN_SWAP_MS), Promise.race([drawn(), wait(MAX_HOLD_MS)])]);
    // Another page asked for meanwhile: swap again under the same cover.
    while (queued) {
      const next = queued;
      queued = null;
      root.setAttribute('data-tx-dir', next.dir);
      await next.change();
      await Promise.race([drawn(), wait(MAX_HOLD_MS)]);
    }
    await wipeOff();
    swapping = false;
  }
}

/**
 * A quick cover over this page while `work` runs (a refine at the forge, say): the loading screen wipes
 * on at twice the page transition's speed, says `text` in place of "Loading…" for as long as `work`
 * takes, then wipes off the same way, uncovering whatever `work` put up under it. Without the motion
 * (or while a page is being swapped), just `work`.
 */
export async function curtain<T>(work: () => Promise<T>, text = 'Loading…'): Promise<T> {
  if (lessMotion() || swapping) return work();
  root.style.setProperty('--tx-phase', `${-(Date.now() % 1000)}ms`);
  root.setAttribute('data-tx-live', '');
  root.setAttribute('data-tx-fast', '');
  root.setAttribute('data-tx-text', text);
  root.setAttribute('data-tx-dir', 'forward');
  root.setAttribute('data-tx', 'in');
  await wait(FAST_WIPE_MS);
  root.setAttribute('data-tx', 'cover');
  try {
    return await work();
  } finally {
    root.setAttribute('data-tx', 'out');
    await wait(FAST_WIPE_MS);
    clear();
  }
}

async function wipeOff(): Promise<void> {
  root.setAttribute('data-tx', 'out');
  await wait(WIPE_MS);
  clear();
}

function clear(): void {
  for (const name of ['data-tx', 'data-tx-dir', 'data-tx-live', 'data-tx-fast', 'data-tx-text']) root.removeAttribute(name);
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
