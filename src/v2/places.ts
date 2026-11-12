import type { Page } from '../site/page';
import { TOWN_NODES, TOWN_ROADS, TOWN_SIZE, type TownNode } from './kr-town';

/*
 * What's in the town (./town.ts, King's Raid's Orvelia from the playtest: ./kr-town.ts): the site's pages v2 can open over
 * it, the buildings on the map that lead to them, and the roads the runner walks between them (the game's own node graph,
 * in the map picture's pixels).
 */

/** The map's size, in its own units: King's Raid's town picture's pixels. */
export const WORLD = TOWN_SIZE;

export interface Point {
  x: number;
  y: number;
}

/**
 * One of the site's pages, opened over the town: its path on the old site (the address it would have there; under v2 it
 * is /v2 + that), whether it needs someone logged in, whether the paths under it are its own (a page's tabs), and its module.
 */
export interface SitePage {
  path: string;
  needsLogin?: boolean;
  subpaths?: boolean;
  page: () => Promise<Page>;
}

/** Every site page v2 opens over the town (as src/site/main.ts's ROUTES, but the front page, which v2 is). */
export const PAGES: readonly SitePage[] = [
  { path: '/player', needsLogin: true, page: () => import('../gear/page').then((m) => m.gearPage) },
  // (v2's own copy of the heroes page, ./heroes/, to adapt to its window.)
  { path: '/heroes', needsLogin: true, page: () => import('./heroes/page').then((m) => m.heroesPage) },
  // (v2's own copies of the inventory and the shop, ./inventory/ and ./shop/, to adapt to its window.)
  { path: '/inventory', needsLogin: true, subpaths: true, page: () => import('./inventory/page').then((m) => m.v2InventoryPage) },
  { path: '/forge', needsLogin: true, page: () => import('../forge/page').then((m) => m.forgePage) },
  { path: '/shop', needsLogin: true, subpaths: true, page: () => import('./shop/page').then((m) => m.v2ShopPage) },
  { path: '/dressing-room', needsLogin: true, page: () => import('../dressing/page').then((m) => m.dressingPage) },
  { path: '/hero-outfits', needsLogin: true, page: () => import('../hero-outfits/page').then((m) => m.heroOutfitsPage) },
  { path: '/databank', subpaths: true, page: () => import('../databank/page').then((m) => m.databankPage) },
  { path: '/admin', needsLogin: true, page: () => import('../admin/page').then((m) => m.adminPage) },
  // v2's own: the casino's tables (./casino.ts).
  { path: '/casino', page: () => import('./casino').then((m) => m.casinoPage) },
];

/** A path without its trailing slashes. */
export const pagePath = (path: string): string => path.replace(/\/+$/, '');

/** The page at `path` (an old-site path: /shop/outfits is the shop's), or undefined. */
export const pageAt = (path: string): SitePage | undefined =>
  PAGES.find((page) => page.path === pagePath(path) || (page.subpaths && pagePath(path).startsWith(`${page.path}/`)));

/** v2's address for an old-site path (/forge/ → /v2/forge/), and back (null: not one of v2's). */
export const V2 = '/v2';
export const v2Path = (path: string): string => `${V2}${path === '/' ? '' : path}/`.replace(/\/{2,}/g, '/');
export function oldPath(path: string): string | null {
  if (path !== V2 && !path.startsWith(`${V2}/`)) return null;
  return path.slice(V2.length) || '/';
}

/** A place on the map: the King's Raid building it is (its node, where the runner stops), and the page it opens. */
export interface Place {
  id: string;
  name: string;
  /** What's inside (the banner's tooltip). */
  blurb: string;
  /** The page it opens (an old-site path). */
  path: string;
  /** Its building's node in the town's graph (./kr-town.ts): its door, where the runner stops. */
  node: TownNode;
  /** Its disc (the game's node button, public/kr/town/discs/). */
  disc: string;
  /** The painted building, a box over it in map pixels (left, top, right, bottom): tapping it goes there too. */
  building: readonly [number, number, number, number];
  /** Its door (its node's point). */
  door: Point;
}

const place = (p: Omit<Place, 'door'>): Place => ({ ...p, door: TOWN_NODES[p.node] });

/** The site's places, each in one of the town's buildings (the Arena and the Prison are free for now). */
export const PLACES: readonly Place[] = [
  place({ id: 'forge', name: 'Forge', blurb: 'Craft, enhance and salvage gear', path: '/forge', node: 'forge', disc: 'forge', building: [2160, 2420, 2780, 2900] }),
  place({ id: 'casino', name: 'Casino', blurb: 'Baccarat, roulette, poker and the mine', path: '/casino', node: 'pub', disc: 'pub', building: [3000, 1860, 3720, 2400] }),
  place({ id: 'databank', name: 'Databank', blurb: 'Heroes, bosses, classes and the week', path: '/databank', node: 'library', disc: 'library', building: [860, 280, 1560, 940] }),
  place({ id: 'shop', name: 'Shop', blurb: 'Heroes, outfits, raid goods and wishes', path: '/shop', node: 'shop', disc: 'shop', building: [740, 2040, 1080, 2480] }),
  place({ id: 'heroes', name: 'Hall of Heroes', blurb: 'Your heroes and their gear', path: '/heroes', node: 'honor', disc: 'honor', building: [1950, 860, 2500, 1200] }),
  place({ id: 'inventory', name: 'Storehouse', blurb: 'Everything you own', path: '/inventory', node: 'guild', disc: 'guild', building: [1960, 1420, 2300, 1840] }),
  place({ id: 'player', name: 'Armory', blurb: 'Your own gear', path: '/player', node: 'castle', disc: 'castle', building: [80, 960, 1380, 2000] }),
];

/** The place whose page is at `path` (its tabs too), if any. */
export const placeOf = (path: string): Place | undefined => {
  const page = pageAt(path);
  return page && PLACES.find((place) => place.path === page.path);
};

/** The roads' points: the buildings' doors and the waypoints between them (King's Raid's, ./kr-town.ts). */
export const NODES: Readonly<Record<string, Point>> = TOWN_NODES;

/** Where the runner stands when the town is first opened: the square, by its statue. */
export const START: TownNode = 'square';

/** The roads: pairs of nodes, walked either way. */
export const ROADS: readonly (readonly [string, string])[] = TOWN_ROADS;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The shortest way along the roads from node `from` to node `to`: the nodes in order (both ends in). */
export function route(from: string, to: string): string[] {
  const best = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set<string>([from]);
  while (open.size) {
    let here = '';
    let cost = Infinity;
    for (const node of open) {
      const c = best.get(node) ?? Infinity;
      if (c < cost) [here, cost] = [node, c];
    }
    open.delete(here);
    if (here === to) break;
    for (const [a, b] of ROADS) {
      const next = a === here ? b : b === here ? a : null;
      if (!next) continue;
      const c = cost + distance(NODES[here] as Point, NODES[next] as Point);
      if (c < (best.get(next) ?? Infinity)) {
        best.set(next, c);
        prev.set(next, here);
        open.add(next);
      }
    }
  }
  const path = [to];
  while (path[0] !== from) {
    const before = prev.get(path[0] as string);
    if (!before) return [from];
    path.unshift(before);
  }
  return path;
}

/** The length of a way through `points`. */
export const lengthOf = (points: readonly Point[]): number => points.reduce((sum, p, i) => (i ? sum + distance(points[i - 1] as Point, p) : 0), 0);

/** The point `along` units into a way through `points` (its end past it), and which way it's heading there. */
export function pointAlong(points: readonly Point[], along: number): { at: Point; dx: number; dy: number } {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const d = distance(a, b);
    if (along <= d || i === points.length - 1) {
      const t = d ? Math.min(1, Math.max(0, along / d)) : 1;
      return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dx: b.x - a.x, dy: b.y - a.y };
    }
    along -= d;
  }
  return { at: points[0] ?? { x: 0, y: 0 }, dx: 0, dy: 0 };
}
