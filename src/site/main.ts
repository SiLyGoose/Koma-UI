import '../shared/style.css';
// Before the pages' styles, which go on top of them (header.ts, button.ts and close.ts import them too).
import '../shared/ui/header/header.css';
import '../shared/ui/button/button.css';
import '../shared/ui/close/close.css';
import '../shared/items/items.css';
import '../hub/hub.css';
import '../gear/gear.css';
import '../inventory/inventory.css';
import '../databank/databank.css';
import '../dressing/dressing.css';
import '../forge/forge.css';
import '../banner/banner.css';
import '../outfits/outfits.css';
import '../hero-shop/hero-shop.css';
import '../heroes/heroes.css';
import '../raid-shop/raid-shop.css';
import '../shop/shop.css';
import '../admin/admin.css';
import { backdrop, siteHeader } from '../shared/ui';
import { installCursor } from '../shared/cursor';
import { installClickSounds } from '../shared/audio';
import { hubPage } from '../hub/page';
import { holdReveal, onSiteLink, swap, type Direction } from '../shared/transition';
import { setGo, type GoOptions } from './nav';
import type { Page } from './page';
import { hasSession } from './session';

/*
 * The site's pages (the front page, the player's gear, the heroes, the inventory, the forge, the shop, the dressing room, the databank, the admin page) as one document: moving between them swaps the
 * page under the header, through the transition's wipe (../shared/transition/), instead of loading a
 * new document, so the header, the login and the rest stay (./session.ts), and back and forward get the
 * wipe too (right to left going back). The games are pages of their own.
 *
 * Every page is its markup (an .html file beside it, a copy put in #view) and a module that sets it up
 * (./page.ts). A history entry's state holds its place in the history (`idx`), which tells back from
 * forward. A page with subpaths (the shop and the inventory, a path for each tab; the databank, one for each section) shows another of its own in place.
 * The front page comes with the router; every other page's module is read the first time it's gone to (the heroes
 * page's, the shop's and the databank's take in the TechnoMagic Raid's sim, which the front page has no use for).
 */

/** A site page as the router knows it before its module is read: where it is, who may see it, and the module. */
interface Route {
  /** Its path, without a trailing slash ('' for the front page). */
  path: string;
  /** Only for someone logged in: anyone else is sent to the front page (which offers to log in). */
  needsLogin?: boolean;
  /** The paths under its own are this page too (the shop's tabs: /shop/outfits); it picks what to show from the path. */
  subpaths?: boolean;
  page: () => Promise<Page>;
}

const HUB: Route = { path: '', page: () => Promise.resolve(hubPage) };
const ROUTES: readonly Route[] = [
  HUB,
  { path: '/player', needsLogin: true, page: () => import('../gear/page').then((m) => m.gearPage) },
  { path: '/heroes', needsLogin: true, page: () => import('../heroes/page').then((m) => m.heroesPage) },
  { path: '/inventory', needsLogin: true, subpaths: true, page: () => import('../inventory/page').then((m) => m.inventoryPage) },
  { path: '/forge', needsLogin: true, page: () => import('../forge/page').then((m) => m.forgePage) },
  { path: '/shop', needsLogin: true, subpaths: true, page: () => import('../shop/page').then((m) => m.shopPage) },
  { path: '/dressing-room', needsLogin: true, page: () => import('../dressing/page').then((m) => m.dressingPage) },
  { path: '/databank', subpaths: true, page: () => import('../databank/page').then((m) => m.databankPage) },
  { path: '/admin', needsLogin: true, page: () => import('../admin/page').then((m) => m.adminPage) },
];

/** Pages that moved: their old paths, and where they are now (the gear page is the Player page). vercel.json redirects them too. */
const MOVED: Readonly<Record<string, string>> = { '/gear': '/player/' };

/** The address last opened as a new document because its page's module couldn't be read (reloadOnce). */
const RELOAD_KEY = 'koma.reloaded';

const view = document.getElementById('view') as HTMLElement;

// The star chart behind every page: put in once, so it carries on as the pages change.
document.body.prepend(backdrop());
// The reticle in place of the mouse pointer.
installCursor();
// A click on anything pressable has its sound.
installClickSounds();
const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

/** A path without its trailing slash (/gear/ and /gear are the same page). */
const pagePath = (path: string): string => path.replace(/\/+$/, '');
const routeAt = (path: string): Route | undefined =>
  ROUTES.find((route) => route.path === pagePath(path) || (route.subpaths && pagePath(path).startsWith(`${route.path}/`)));

let current: { route: Route; unmount: () => void; navigate?: (url: URL) => void } | null = null;
/** Counts the pages asked for: one whose module comes in after another was asked for isn't shown. */
let asked = 0;
/** This entry's place in the history (history.state.idx): higher is further forward. */
let index = typeof history.state?.idx === 'number' ? (history.state.idx as number) : 0;
history.replaceState({ ...history.state, idx: index }, '');

/** Opens `url` as a new document, unless that was the last thing done for it (it would go round for ever): whether it did. */
function reloadOnce(url: URL): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === url.href) return false;
    sessionStorage.setItem(RELOAD_KEY, url.href);
  } catch {
    // No storage: no telling whether it was just done.
    return false;
  }
  location.assign(url.href);
  return true;
}

/**
 * Shows the page for `url` in #view (the front page, for a path that isn't one): the one showing goes
 * first, once the new one's module is read. Done once the page is set up; the transition waits for its
 * module and for it to draw itself (holdReveal).
 */
async function show(url: URL): Promise<void> {
  // Held before anything is waited for, so the first page's reveal waits too.
  const release = holdReveal();
  const mine = ++asked;
  const moved = MOVED[pagePath(url.pathname)];
  if (moved) {
    url = new URL(moved + url.search + url.hash, url);
    history.replaceState(history.state, '', url);
  }
  let route = routeAt(url.pathname) ?? HUB;
  // Only for someone logged in: the front page instead, which offers to log in.
  if (route.needsLogin && !hasSession()) {
    route = HUB;
    history.replaceState(history.state, '', '/');
  }
  let page: Page;
  try {
    page = await route.page();
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      // Nothing kept.
    }
  } catch (error) {
    // Its module can't be read: most likely the site was updated since this document was opened, and the old one is
    // gone. The address as a new document, which comes with the new modules; or, that done already, the front page.
    console.error(error);
    if (mine !== asked) return release();
    if (reloadOnce(url)) return;
    route = HUB;
    page = hubPage;
    history.replaceState(history.state, '', '/');
  }
  // Another page was asked for meanwhile: that one is shown instead.
  if (mine !== asked) return release();
  current?.unmount();
  view.innerHTML = page.markup;
  const root = view.firstElementChild as HTMLElement;

  document.title = page.title;
  if (icon) icon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${page.icon}</text></svg>`;
  for (const link of siteHeader().links) {
    const here = link.dataset.route === (route.path || '/') && route !== HUB;
    link.classList.toggle('active', here);
    if (here) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  const { drawn, unmount, navigate } = page.mount(root);
  current = { route, unmount, navigate };
  window.scrollTo(0, 0);
  void drawn
    .catch(() => undefined)
    .then(() => {
      // A link to a place on the page (/#games): there, once it's drawn.
      if (url.hash) document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
    })
    .finally(release);
}

/** Goes to a site page, through the wipe: a new history entry (or this one replaced), then the page swapped in. */
function go(href: string, options: GoOptions = {}): void {
  const url = new URL(href, location.href);
  const route = routeAt(url.pathname);
  const samePage = current !== null && route === current.route;
  if (samePage && !options.reload) {
    // Only somewhere else on this page (or nowhere): no swap.
    const moved = pagePath(url.pathname) !== pagePath(location.pathname);
    history.pushState({ idx: ++index }, '', url);
    if (moved) current?.navigate?.(url);
    if (url.hash) document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (options.replace) history.replaceState({ idx: index }, '', url);
  else history.pushState({ idx: ++index }, '', url);
  // Its module read while the wipe goes on, not once it has (show() takes it from there, or says it couldn't be), and the
  // bot asked for its data meanwhile too.
  void route
    ?.page()
    .then((page) => page.prefetch?.(url))
    .catch(() => undefined);
  void swap(options.back ? 'back' : 'forward', () => show(url));
}

/**
 * A link to one of the site's pages, the mouse over it or the keyboard on it: its module read already (not its data),
 * so it's there by the time it's clicked.
 */
function warm(event: Event): void {
  const link = (event.target as Element | null)?.closest?.('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return;
  const url = new URL(link.href, location.href);
  if (url.origin === location.origin) void routeAt(url.pathname)?.page().catch(() => undefined);
}
document.addEventListener('pointerover', warm, { passive: true });
document.addEventListener('focusin', warm);

setGo(go);

// Links to the site's pages are this router's; anything else (a game) the transition takes as a new document.
onSiteLink((url, link) => {
  if (url.origin !== location.origin || !routeAt(url.pathname)) return false;
  go(url.href, { back: link.classList.contains('back') });
  return true;
});

// Back and forward: the page of that entry, the wipe running right to left going back.
window.addEventListener('popstate', (e) => {
  const state = e.state as { idx?: number } | null;
  const to = typeof state?.idx === 'number' ? state.idx : index;
  const dir: Direction = to < index ? 'back' : 'forward';
  index = to;
  // Another place on the same page (a #link): the browser scrolls there itself. Another of its paths: it shows that.
  if (current && routeAt(location.pathname) === current.route) return current.navigate?.(new URL(location.href));
  void swap(dir, () => show(new URL(location.href)));
});

// The first page, under the loading screen when it was arrived at through a transition (transition/head.js).
void show(new URL(location.href));
