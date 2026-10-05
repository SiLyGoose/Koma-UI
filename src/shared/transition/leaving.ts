import { handOnly } from '../cursor';
import { KEY, LOAD_MS, MAX_FETCH_MS, WIPE_MS } from './timing';
import { lessMotion, root, wait, wipeOn, type Direction } from './wipe';

interface Pending {
  /** The page it's going to (its path, without a trailing slash). */
  to: string;
  dir: Direction;
  at: number;
}

/** This page is on its way out (wiped over, or going back): nothing else starts another. */
export const page = { leaving: false };

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

/** Wipes the loading screen over this page, fetches `url` meanwhile, then goes there. */
async function leave(url: URL, dir: Direction): Promise<void> {
  page.leaving = true;
  const pending: Pending = { to: pagePath(url.pathname), dir, at: Date.now() };
  remember(pending);
  // A game has the hand alone for a cursor: the dot and brackets go as this page does.
  if (pending.to.startsWith('/games/')) handOnly();
  wipeOn(dir);
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
  if (page.leaving) return;
  if (!goesThrough(url) || lessMotion()) {
    location.href = url.href;
    return;
  }
  void leave(url, options.back ? 'back' : 'forward');
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
