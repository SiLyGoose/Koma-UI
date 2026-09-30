import '../shared/style.css';
import '../shared/header.css';
import '../shared/items/items.css';
import '../hub/hub.css';
import '../gear/gear.css';
import '../databank/databank.css';
import '../forge/forge.css';
import { backdrop } from '../shared/backdrop';
import { installCursor } from '../shared/cursor';
import { databankPage } from '../databank/page';
import { forgePage } from '../forge/page';
import { gearPage } from '../gear/page';
import { hubPage } from '../hub/page';
import { keepHoloInStep } from '../shared/items/items';
import { holdReveal, onSiteLink, swap, type Direction } from '../shared/transition';
import { setGo, type GoOptions } from './nav';
import type { Page } from './page';
import { hasSession } from './session';

/*
 * The site's pages (the front page, gear, the forge, the databank) as one document: moving between them swaps the
 * page under the header, through the transition's wipe (../shared/transition.ts), instead of loading a
 * new document, so the header, the login and the rest stay (./session.ts), and back and forward get the
 * wipe too (right to left going back). The games are pages of their own.
 *
 * Every page is its markup (an .html file beside it, a copy put in #view) and a module that sets it up
 * (./page.ts). A history entry's state holds its place in the history (`idx`), which tells back from
 * forward.
 */

const PAGES: readonly Page[] = [hubPage, gearPage, forgePage, databankPage];

const view = document.getElementById('view') as HTMLElement;

// The star chart behind every page: put in once, so it carries on as the pages change.
document.body.prepend(backdrop());
// The reticle in place of the mouse pointer.
installCursor();
// The masterworks' foil carries on as their cards are drawn again.
keepHoloInStep();
const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

/** A path without its trailing slash (/gear/ and /gear are the same page). */
const pagePath = (path: string): string => path.replace(/\/+$/, '');
const pageAt = (path: string): Page | undefined => PAGES.find((page) => page.path === pagePath(path));

let current: { page: Page; unmount: () => void } | null = null;
/** This entry's place in the history (history.state.idx): higher is further forward. */
let index = typeof history.state?.idx === 'number' ? (history.state.idx as number) : 0;
history.replaceState({ ...history.state, idx: index }, '');

/**
 * Shows the page for `url` in #view (the front page, for a path that isn't one): the one showing goes
 * first. Done once the page is set up; the transition waits for it to draw itself (holdReveal).
 */
function show(url: URL): void {
  let page = pageAt(url.pathname) ?? hubPage;
  // Only for someone logged in: the front page instead, which offers to log in.
  if (page.needsLogin && !hasSession()) {
    page = hubPage;
    history.replaceState(history.state, '', '/');
  }
  current?.unmount();
  view.innerHTML = page.markup;
  const root = view.firstElementChild as HTMLElement;

  document.title = page.title;
  if (icon) icon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${page.icon}</text></svg>`;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.site-nav-link[data-route]')) {
    const here = link.dataset.route === (page.path || '/') && page !== hubPage;
    link.classList.toggle('active', here);
    if (here) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  const release = holdReveal();
  const { drawn, unmount } = page.mount(root);
  current = { page, unmount };
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
  const samePage = current !== null && pageAt(url.pathname) === current.page;
  if (samePage && !options.reload) {
    // Only somewhere else on this page (or nowhere): no swap.
    history.pushState({ idx: ++index }, '', url);
    if (url.hash) document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (options.replace) history.replaceState({ idx: index }, '', url);
  else history.pushState({ idx: ++index }, '', url);
  void swap(options.back ? 'back' : 'forward', () => show(url));
}

setGo(go);

// Links to the site's pages are this router's; anything else (a game) the transition takes as a new document.
onSiteLink((url, link) => {
  if (url.origin !== location.origin || !pageAt(url.pathname)) return false;
  go(url.href, { back: link.classList.contains('back') });
  return true;
});

// Back and forward: the page of that entry, the wipe running right to left going back.
window.addEventListener('popstate', (e) => {
  const state = e.state as { idx?: number } | null;
  const to = typeof state?.idx === 'number' ? state.idx : index;
  const dir: Direction = to < index ? 'back' : 'forward';
  index = to;
  // Another place on the same page (a #link): the browser scrolls there itself.
  if (current && pageAt(location.pathname) === current.page) return;
  void swap(dir, () => show(new URL(location.href)));
});

// The first page, under the loading screen when it was arrived at through a transition (transition-head.js).
show(new URL(location.href));
