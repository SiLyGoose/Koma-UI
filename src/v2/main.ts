// The site's styles, in the order src/site/main.ts has them (the pages shown over the town need theirs as they are there).
import css0 from '../shared/style.css?inline';
import css1 from '../shared/ui/header/header.css?inline';
import css2 from '../shared/ui/button/button.css?inline';
import css3 from '../shared/ui/close/close.css?inline';
import css4 from '../shared/ui/page-bar/page-bar.css?inline';
import css5 from '../shared/items/items.css?inline';
import css6 from '../hub/hub.css?inline';
import css7 from '../gear/gear.css?inline';
import css8 from '../inventory/inventory.css?inline';
import css9 from '../databank/databank.css?inline';
import css10 from '../dressing/dressing.css?inline';
import css11 from '../forge/forge.css?inline';
import css12 from '../banner/banner.css?inline';
import css13 from '../outfits/outfits.css?inline';
import css14 from '../hero-shop/hero-shop.css?inline';
import css15 from '../hero-outfit-shop/hero-outfit-shop.css?inline';
import css16 from '../heroes/heroes.css?inline';
import css17 from '../hero-outfits/hero-outfits.css?inline';
import css18 from '../raid-shop/raid-shop.css?inline';
import css19 from '../shop/shop.css?inline';
import css20 from '../admin/admin.css?inline';
import './v2.css';
import { useLandscapeCss } from './landscape-css';
import { installCursor } from '../shared/cursor';
import { installClickSounds } from '../shared/audio';
import { holdReveal, onSiteLink, swap, type Direction } from '../shared/transition';
import { landscapeCover } from '../shared/ui/landscape/landscape';
import { setGo, type GoOptions } from '../site/nav';
import { hasSession, loadMe } from '../site/session';
import { makeFriendsCount } from './friends';
import { makeHeroPick, type WalkerChoice } from './hero-pick';
import { makeHud } from './hud';
import { makeLobby } from './lobby';
import { makeProfile } from './profile';
import { makePanel } from './panel';
import { oldPath, pageAt, pagePath, placeOf, PLACES, V2, v2Path, type Place } from './places';
import { makeTown } from './town';

/*
 * Komaverse v2: the site as a town. No header and no navigation bar: the whole screen, held in landscape (on a phone held
 * upright, the cover asking to turn it, or turning the page itself), is the town map (./town.ts) with what's left of a
 * header in its corners (./hud.ts). Tapping a place sends the runner there; at its door its page opens over the town
 * (./panel.ts), the same pages as the old site's, at /v2 + their old address (/v2/forge/, /v2/shop/outfits/). Back (the
 * page's own back arrow, the browser's, Escape, or the top bar's back button over every page) is the town again, the runner at that door.
 */

// The site's styles, always their wide-screen layout (./landscape-css.ts), before v2's own; on a small screen the shop's
// outfits, heroes and hero outfits answered for a screen ROW wide, their cards one row that scrolls sideways, as King's
// Raid's shop has them (on a bigger one, the site's desktop grid as everywhere else).
const ROW = 760;
useLandscapeCss([css0, css1, css2, css3, css4, css5, css6, css7, css8, css9, css10, css11, css12, [css13, ROW], [css14, ROW], [css15, ROW], css16, css17, css18, css19, css20]);

const app = document.getElementById('v2') as HTMLElement;
const release = holdReveal();

// The hand alone, as in the games: no dot or brackets trailing it over the town.
installCursor({ reticle: false });
installClickSounds();
landscapeCover(document.body, { title: 'Turn your phone sideways', text: 'The town is played in landscape, filling the screen.' });

const town = makeTown(app, arrived, (place) => place.path && ahead(new URL(place.path, location.href)));
const hud = makeHud(app);
// (A page's own way back, if it has one: back to there, as its own back link would.)
const panel = makePanel(app, (href) => (href ? go(href, { back: true }) : backToTown()));

/**
 * Who walks the town: one of the member's heroes, or Roi (./hero-pick.ts), its model read once known (./walker.ts,
 * three.js); the one before walks on till it's read.
 */
let walking = '';
function walkAs(choice: WalkerChoice): void {
  const key = `${choice.id}:${choice.skin}`;
  if (key === walking) return;
  walking = key;
  void import('./walker')
    .then(async ({ makeWalker }) => {
      const walker = makeWalker();
      if ((await walker.show(choice.id, choice.skin)) && walking === key) town.setWalker(walker);
      else walker.destroy();
    })
    .catch((error: unknown) => console.warn(error));
}
const pick = makeHeroPick((choice) => {
  walkAs(choice);
  profile.render();
});
// The member at the top left (their profile: the server, who walks), and King's Raid's menus in the bottom corners.
const profile = makeProfile(
  hud.element.querySelector('.v2-hud-left') as HTMLElement,
  pick,
  hud.logIn,
  // Another server: its balance, and who walks there, of the heroes owned there.
  () => {
    hud.render();
    lobby.render();
    friends.render();
    void pick.settle();
  },
  // Logged out: the town as anyone sees it.
  () => {
    hud.render();
    profile.render();
    lobby.render();
    friends.render();
    void pick.settle();
  },
);
// (Adventure's window covers the town: not drawn under it; back to the town, drawn again unless a page covers it.)
const lobby = makeLobby(
  hud.element,
  (path) => go(path),
  hud.note,
  (open) => (open ? town.pause() : !panel.showing() && town.resume()),
);
// How many others are online, on the menu's Friends (and the town counted as being on the site).
const friends = makeFriendsCount(lobby.friendsButton);

/** King's Raid's units on this screen (its lobby is laid out for a 1080-high screen): never under half. */
const krScale = new ResizeObserver(() => app.style.setProperty('--kr', String(Math.min(1, Math.max(0.5, app.clientHeight / 1080)))));
krScale.observe(app);

/**
 * v2's pages swap under the quick wipe (../shared/transition/swap.ts, curtain()'s speed both ways), not the old site's full
 * one: about 1.1 s at the least to change page, not 1.9 s. Going to a game, as a new document, is the full wipe still.
 */
const FAST = { fast: true };

/** This entry's place in the history (higher: further forward), as the old site keeps it. */
let index = typeof history.state?.idx === 'number' ? (history.state.idx as number) : 0;
history.replaceState({ ...history.state, idx: index }, '');

/** An old-site URL from v2's (/v2/shop/outfits/?x → /shop/outfits?x), or null (not under /v2). */
function oldUrl(url: URL): URL | null {
  const path = oldPath(pagePath(url.pathname) || '/');
  return path === null ? null : new URL(path + url.search + url.hash, url);
}

/**
 * The page at old-site `url` read now and the bot asked for its data, before it's opened: as the runner sets off for its
 * door (the walk hides it), and as another page is gone to (the wipe on hides it), as the old site's go() does. The page's
 * own requests, once it's set up, take those answers (../site/session.ts prefetch()). Not for a page that needs a login, logged out.
 */
function ahead(url: URL): void {
  const site = pageAt(url.pathname);
  if (!site || (site.needsLogin && !hasSession())) return;
  void site
    .page()
    .then((page) => page.prefetch?.(url))
    .catch(() => undefined);
}

/**
 * A place's page or a link to one of v2's pages, the mouse over it or the keyboard on it: its module read already (not its
 * data), so it's there by the time it's picked.
 */
function warm(event: Event): void {
  const target = event.target as Element | null;
  const place = PLACES.find((p) => p.id === target?.closest?.('[data-place]')?.getAttribute('data-place'));
  if (place) return void (place.path && pageAt(place.path)?.page().catch(() => undefined));
  const link = target?.closest?.('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  const path = oldPath(pagePath(url.pathname) || '/') ?? pagePath(url.pathname);
  if (path) void pageAt(path)?.page().catch(() => undefined);
}
document.addEventListener('pointerover', warm, { passive: true });
document.addEventListener('focusin', warm);

/** Shows what `url` (v2's) is: the town, or a page over it. A page that needs a login, logged out: the town, saying so. */
async function apply(url: URL): Promise<void> {
  const old = oldUrl(url);
  const site = old && old.pathname !== '/' ? pageAt(old.pathname) : undefined;
  if (!old || !site) {
    if (panel.showing()) {
      // The runner at the door of the place whose page it was.
      const from = PLACES.find((place) => place.path && pageAt(place.path) === panel.showing());
      panel.close();
      town.standAt(from ?? null);
    }
    town.resume();
    return;
  }
  if (site.needsLogin && !hasSession()) {
    history.replaceState({ idx: index }, '', `${V2}/`);
    panel.close();
    town.standAt(placeOf(old.pathname) ?? null);
    town.resume();
    hud.note('Log in to go in there.', true);
    return;
  }
  town.pause();
  await panel.open(old);
}

/** The runner is at `place`'s door: its page, unless it needs a login (Adventure's door: its window, over the town). */
function arrived(place: Place): void {
  if (!place.path) {
    hud.note(null);
    return lobby.adventure.open();
  }
  const site = pageAt(place.path);
  if (site?.needsLogin && !hasSession()) return hud.note(`Log in to go into the ${place.name}.`, true);
  hud.note(null);
  history.pushState({ idx: ++index, fromTown: true }, '', v2Path(place.path));
  void swap('forward', () => apply(new URL(location.href)), FAST);
}

/** Back to the town from a page: back in the history when the town is the entry before it, else the town in its place. */
function backToTown(): void {
  if (!panel.showing()) return;
  if (history.state?.fromTown) return history.back();
  history.replaceState({ idx: index }, '', `${V2}/`);
  void swap('back', () => apply(new URL(location.href)), FAST);
}

/**
 * Where a page sends the member (../site/nav.ts go(), and links to the site's pages): the front page is the town; another
 * of v2's pages opens over it (in place, for another of the same page's tabs); anything else, as a new document.
 */
function go(href: string, options: GoOptions = {}): void {
  const url = new URL(href, location.href);
  const path = oldPath(pagePath(url.pathname) || '/') ?? pagePath(url.pathname) ?? '/';
  if (path === '/' || path === '') return backToTown();
  const site = pageAt(path);
  if (!site) return void location.assign(url.href);
  const next = v2Path(path) + url.search + url.hash;
  const same = panel.showing() === site;
  if (options.replace) history.replaceState({ idx: index }, '', next);
  else history.pushState({ idx: ++index }, '', next);
  if (same && !options.reload) return void apply(new URL(location.href));
  ahead(new URL(path + url.search + url.hash, location.href));
  void swap(options.back ? 'back' : 'forward', () => apply(new URL(location.href)), FAST);
}
setGo(go);

// Links to the site's pages (and to the front page) are v2's; anything else (a game) the transition takes as a new document.
onSiteLink((url, link) => {
  if (url.origin !== location.origin) return false;
  const path = oldPath(pagePath(url.pathname) || '/') ?? (pagePath(url.pathname) || '/');
  if (path !== '/' && !pageAt(path)) return false;
  go(url.href, { back: link.classList.contains('back') });
  return true;
});

window.addEventListener('popstate', (e) => {
  const state = e.state as { idx?: number } | null;
  const to = typeof state?.idx === 'number' ? state.idx : index;
  const dir: Direction = to < index ? 'back' : 'forward';
  index = to;
  const site = pageAt(oldPath(pagePath(location.pathname) || '/') ?? '/');
  // Another tab of the page showing: in place.
  if (site && site === panel.showing()) return void apply(new URL(location.href));
  const old = oldUrl(new URL(location.href));
  if (old) ahead(old);
  void swap(dir, () => apply(new URL(location.href)), FAST);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panel.showing() && !document.querySelector('[role="dialog"]:not([hidden])')) backToTown();
});

// Back from a game to this page as the browser kept it: the balance (which the game changed) asked for again.
window.addEventListener('pageshow', (e) => {
  if (e.persisted && hasSession())
    void loadMe(true).then(() => {
      hud.render();
      profile.render();
      lobby.render();
    });
});

async function start(): Promise<void> {
  // Opened at a page's address (/v2/forge/): the runner at its door, the page over the town.
  const old = oldUrl(new URL(location.href));
  town.standAt((old && placeOf(old.pathname)) ?? null);
  if (hasSession()) {
    const me = await loadMe(true);
    if (!me.ok && me.status !== 0) hud.note('Your login ran out. Log in again.', true);
    hud.render();
    profile.render();
    lobby.render();
    friends.render();
  }
  void pick.settle();
  // Back from a raid opened from Adventure (its back arrow: ../shared/ui/frame/v2-game.ts): Adventure open on its tab, the
  // address the town's again.
  const url = new URL(location.href);
  const adventure = url.searchParams.get('adventure');
  if (adventure !== null) {
    url.searchParams.delete('adventure');
    history.replaceState(history.state, '', url.href);
  }
  await apply(url);
  if (adventure !== null) lobby.adventure.open(adventure);
}
void start().finally(release);


