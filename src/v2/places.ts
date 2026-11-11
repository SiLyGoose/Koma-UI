import type { Page } from '../site/page';

/*
 * What's in the town (./map.ts): the site's pages v2 can open over it, the places on the map that lead to them, and the
 * roads the runner walks between them (a graph of points in the map's own units: WORLD wide and high).
 */

/** The map's size, in its own units (its pictures are drawn in these). */
export const WORLD = { width: 2400, height: 1350 } as const;

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
  { path: '/heroes', needsLogin: true, page: () => import('../heroes/page').then((m) => m.heroesPage) },
  { path: '/inventory', needsLogin: true, subpaths: true, page: () => import('../inventory/page').then((m) => m.inventoryPage) },
  { path: '/forge', needsLogin: true, page: () => import('../forge/page').then((m) => m.forgePage) },
  { path: '/shop', needsLogin: true, subpaths: true, page: () => import('../shop/page').then((m) => m.shopPage) },
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

/** A place on the map: its building, where its door is (a road's end, where the runner stops), and the page it opens. */
export interface Place {
  id: string;
  name: string;
  /** Under the name on its sign. */
  blurb: string;
  /** The page it opens (an old-site path). */
  path: string;
  /** The road's end at its door: the graph's node of the same id. */
  door: Point;
}

export const PLACES: readonly Place[] = [
  { id: 'forge', name: 'Forge', blurb: 'Craft, enhance and salvage gear', path: '/forge', door: { x: 430, y: 760 } },
  { id: 'casino', name: 'Casino', blurb: 'Baccarat, roulette, poker and the mine', path: '/casino', door: { x: 1960, y: 760 } },
  { id: 'databank', name: 'Databank', blurb: 'Heroes, bosses, classes and the week', path: '/databank', door: { x: 1200, y: 470 } },
  { id: 'shop', name: 'Shop', blurb: 'Heroes, outfits, raid goods and wishes', path: '/shop', door: { x: 680, y: 1090 } },
  { id: 'heroes', name: 'Hall of Heroes', blurb: 'Your heroes and their gear', path: '/heroes', door: { x: 770, y: 470 } },
  { id: 'inventory', name: 'Storehouse', blurb: 'Everything you own', path: '/inventory', door: { x: 1740, y: 1090 } },
  { id: 'player', name: 'Armory', blurb: 'Your own gear', path: '/player', door: { x: 1640, y: 470 } },
];

/** The place whose page is at `path` (its tabs too), if any. */
export const placeOf = (path: string): Place | undefined => {
  const page = pageAt(path);
  return page && PLACES.find((place) => place.path === page.path);
};

/**
 * The roads' points: the places' doors (by their ids), the crossings, and the square's edge (north, south, west, east of
 * its fountain: the way across the square goes round it).
 */
export const NODES: Readonly<Record<string, Point>> = {
  ...Object.fromEntries(PLACES.map((place) => [place.id, place.door])),
  north: { x: 1200, y: 595 },
  south: { x: 1200, y: 885 },
  west: { x: 1050, y: 740 },
  east: { x: 1350, y: 740 },
  forgeRoad: { x: 860, y: 740 },
  casinoRoad: { x: 1540, y: 740 },
  northwest: { x: 800, y: 610 },
  northeast: { x: 1610, y: 610 },
  southwest: { x: 880, y: 1060 },
  southeast: { x: 1520, y: 1060 },
};

/** Where the runner stands when the town is first opened: the square, in front of the fountain. */
export const START = 'south';

/** The roads: pairs of nodes, walked either way. */
export const ROADS: readonly (readonly [string, string])[] = [
  ['north', 'west'],
  ['west', 'south'],
  ['south', 'east'],
  ['east', 'north'],
  ['north', 'databank'],
  ['west', 'forgeRoad'],
  ['forgeRoad', 'forge'],
  ['forgeRoad', 'northwest'],
  ['northwest', 'heroes'],
  ['northwest', 'north'],
  ['east', 'casinoRoad'],
  ['casinoRoad', 'casino'],
  ['casinoRoad', 'northeast'],
  ['northeast', 'player'],
  ['northeast', 'north'],
  ['south', 'southwest'],
  ['southwest', 'shop'],
  ['south', 'southeast'],
  ['southeast', 'inventory'],
];

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
export function pointAlong(points: readonly Point[], along: number): { at: Point; dx: number } {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const d = distance(a, b);
    if (along <= d || i === points.length - 1) {
      const t = d ? Math.min(1, Math.max(0, along / d)) : 1;
      return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dx: b.x - a.x };
    }
    along -= d;
  }
  return { at: points[0] ?? { x: 0, y: 0 }, dx: 0 };
}
