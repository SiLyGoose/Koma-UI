import { handOnly } from '../cursor';
import { KEY, LOAD_MS, MAX_FETCH_MS, WIPE_MS } from './timing';
import { lessMotion, root, shownSprite, wait, wipeOff, wipeOn, type Direction } from './wipe';

/** What a page says as it goes, for the next one (transition/head.js). */
export interface Pending {
  /** The page it's going to (its path, without a trailing slash). None going back (back.ts): wherever that is. */
  to?: string;
  dir: Direction;
  at: number;
  /** The loading screen's sprite, so the next page's shows the same one until it's wiped off. */
  sprite: string;
}

/** This page is on its way out (wiped over, or going back): nothing else starts another. */
export const page = { leaving: false };

/** A page's path without its trailing slash (/gear/ and /gear are the same page), as transition/head.js compares them. */
const pagePath = (path: string): string => path.replace(/\/+$/, '');

/** Whether going to `url` gets a transition: another page (a game on another site too, from a game link). */
function goesThrough(url: URL): boolean {
  const to = pagePath(url.pathname);
  if (url.origin === location.origin) return to !== pagePath(location.pathname);
  return /^\/games\/[^/]+$/.test(to);
}

export function remember(pending: Pending): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // No storage: this half still plays; the next page just shows up.
  }
}

/**
 * Wipes the loading screen over this page, fetches where it's going meanwhile, then goes there. `to` can take a
 * while to say where (navigateAfter()): the loading screen stays up as it does. Nowhere (null) wipes it off again
 * and stays on this page: false.
 */
async function leave(to: URL | Promise<URL | null>, dir: Direction): Promise<boolean> {
  page.leaving = true;
  wipeOn(dir);
  const coverAt = Date.now() + WIPE_MS;
  const covered = wait(WIPE_MS).then(() => root.setAttribute('data-tx', 'cover'));
  const url = await to;
  if (!url) {
    await covered;
    await wipeOff();
    page.leaving = false;
    return false;
  }
  // Somewhere with no transition of its own: straight there, from under the loading screen.
  if (!goesThrough(url)) {
    location.href = url.href;
    return true;
  }
  const pending = { to: pagePath(url.pathname), dir, at: Date.now(), sprite: shownSprite() } satisfies Pending;
  remember(pending);
  // A game has the hand alone for a cursor: the dot and brackets go as this page does.
  if (pending.to.startsWith('/games/')) handOnly();
  // Fetched now, so it comes from the cache once the browser goes there. Only this site's pages.
  const fetched =
    url.origin === location.origin
      ? fetch(url.pathname + url.search, { credentials: 'same-origin' }).then(
          () => undefined,
          () => undefined,
        )
      : Promise.resolve();
  await covered;
  // The loading screen shows at least LOAD_MS, counted from when it covered the page (so not again after a wait for `to`).
  await Promise.all([wait(coverAt + LOAD_MS - Date.now()), Promise.race([fetched, wait(MAX_FETCH_MS)])]);
  remember({ ...pending, at: Date.now() });
  location.href = url.href;
  return true;
}

/**
 * Sends the browser to `href`, through a transition when there is one for it. For code that goes
 * somewhere by itself (links go through one on their own). `back` runs it right to left.
 */
export function navigate(href: string, options: { back?: boolean } = {}): void {
  const url = new URL(href, location.href);
  if (page.leaving) return;
  if (!goesThrough(url) || lessMotion()) {
    location.href = url.href;
    return;
  }
  void leave(url, options.back ? 'back' : 'forward');
}

/**
 * navigate(), for somewhere only known once `where` is done (asking the bot for a game's link, say): the loading
 * screen wipes on at once and stays up while it works, then goes on to the page as navigate()'s does, so it's one
 * transition straight there. False when `where` comes back with nowhere (null, or fails): the loading screen wipes
 * off again and this page carries on, for the caller to say why. (On its way somewhere already: true, and nothing.)
 */
export async function navigateAfter(where: () => Promise<string | null>, options: { back?: boolean } = {}): Promise<boolean> {
  if (page.leaving) return true;
  const to = where().then(
    (href) => (href === null ? null : new URL(href, location.href)),
    () => null,
  );
  if (lessMotion()) {
    const url = await to;
    if (url) location.href = url.href;
    return url !== null;
  }
  return leave(to, options.back ? 'back' : 'forward');
}

/** Claims a link to one of this document's own pages (the router); true when it did. */
let siteLink: ((url: URL, link: HTMLAnchorElement) => boolean) | null = null;

/** The router takes the links to its pages: `handler` goes there itself and says true, or says false. */
export function onSiteLink(handler: (url: URL, link: HTMLAnchorElement) => boolean): void {
  siteLink = handler;
}

/** Same-site links: a plain left click (not one for a new tab or a download). A game's ← goes back. */
export function catchLinks(): void {
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
      if (!page.leaving) void leave(url, link.classList.contains('back') ? 'back' : 'forward');
    },
    // Before the drop-downs' own handlers, which keep their clicks to themselves.
    true,
  );
}
