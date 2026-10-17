import { tierOf, tierRank } from './items';
import type { GearCopy, GearRefine, GearView, StatRow } from '../../protocol/gear';
import type { MainStat } from '../../protocol/items';

/** A member's gear as the bot says it (../../protocol/gear.ts). */
export type { GearCopy, GearLoadout, GearRefine, GearView, RefineBlock, StatRow, StatSection } from '../../protocol/gear';


/*
 * What the bot's /api/gear answers (its web/gear.ts), for the pages that show a member's gear: the gear
 * page and the forge.
 */

/** What the armories order a copy by. */
interface Ordered {
  id: string;
  itemId: string;
  name: string;
  level: number;
  stars: number;
  effects: readonly string[];
  mainStat?: MainStat | null;
  heroOnly?: boolean;
  uniqueWeapon?: string | null;
  uniqueTreasure?: { hero: string; skill: number } | null;
}

/**
 * How the armories sort TechnoMagic gear (their Filter's Sort), each part left out when it's empty: by a main stat
 * (`main`: its name, as a copy's `mainStat` has it, like "P. DEF"), the copies with it first, the most first; then by
 * potentials (`potentials`: their names, as a copy's effect lines have them, like "ATK"), the copies with more of them
 * first, then those with more of them all told (their percents added up).
 */
export interface TmSort {
  main: string | null;
  potentials: readonly string[];
}

/** TechnoMagic gear in the armories' own order. */
export const TM_UNSORTED: TmSort = { main: null, potentials: [] };

/**
 * The copies in the order the armories show them: by star tier (4 stars first), then by name, A to Z
 * (so an item's copies sit together), then each item's copies from the most refined down. Sorting TechnoMagic gear
 * (`sort`), its copies go by that, and the rest stay after them in this order.
 */
export function armoryOrder<C extends Ordered>(copies: readonly C[], sort: TmSort = TM_UNSORTED): C[] {
  // TechnoMagic gear first: a tier of its own, above 4 stars; then the unique weapons, then the unique treasures.
  const tier = tierRank;
  const ordered = [...copies].sort(
    (a, b) =>
      tier(b) - tier(a) ||
      a.name.localeCompare(b.name) ||
      a.itemId.localeCompare(b.itemId) ||
      b.level - a.level ||
      a.id.localeCompare(b.id),
  );
  if (sort.main === null && sort.potentials.length === 0) return ordered;
  const keys = new Map(ordered.map((copy) => [copy.id, sortKey(copy, sort)]));
  const key = (copy: C): [number, number, number] => keys.get(copy.id) as [number, number, number];
  return ordered.sort((a, b) => key(b)[0] - key(a)[0] || key(b)[1] - key(a)[1] || key(b)[2] - key(a)[2]);
}

/**
 * Where a copy goes by `sort`, the most first: its main stat's value (0 for all, with none picked), how many of the
 * potentials it has, and their percents added up. -1 for each: not TechnoMagic gear; for the main stat: not that one.
 */
function sortKey(copy: Ordered, sort: TmSort): [number, number, number] {
  if (tierOf(copy) !== 'tm') return [-1, -1, -1];
  const main = sort.main === null ? 0 : copy.mainStat?.name === sort.main ? copy.mainStat.value : -1;
  const potentials = potentialsOf(copy);
  let count = 0;
  let total = 0;
  for (const name of sort.potentials) {
    const value = potentials.get(name);
    if (value === undefined) continue;
    count++;
    total += value;
  }
  return [main, count, total];
}

/** A potential's line as the bot says it (its lib/game/heroes.ts potentialLines): "+12% ATK". */
const POTENTIAL_LINE = /^\+(\d+(?:\.\d+)?)% (.+)$/;

/** A copy's potentials, as its effect lines say them: how much of each by its name (12 for "+12% ATK"). */
function potentialsOf(copy: Ordered): Map<string, number> {
  const potentials = new Map<string, number>();
  for (const line of copy.effects) {
    const found = POTENTIAL_LINE.exec(line);
    if (found?.[1] && found[2]) potentials.set(found[2], Number(found[1]));
  }
  return potentials;
}

/** What TechnoMagic gear can be sorted by (TmSort). */
export interface TmStats {
  main: string[];
  potentials: string[];
}

/** The stats the TechnoMagic copies among `copies` have: their main stats' names and their potentials', each A to Z. */
export function tmStats(copies: readonly Ordered[]): TmStats {
  const main = new Set<string>();
  const potentials = new Set<string>();
  for (const copy of copies) {
    if (tierOf(copy) !== 'tm') continue;
    if (copy.mainStat) main.add(copy.mainStat.name);
    for (const name of potentialsOf(copy).keys()) potentials.add(name);
  }
  const az = (names: Set<string>): string[] => [...names].sort((a, b) => a.localeCompare(b));
  return { main: az(main), potentials: az(potentials) };
}

/** The copies worn or saved in any of the member's loadouts: the ones the armories tag Equipped. */
export function equippedIds(gear: GearView): Set<string> {
  const ids = new Set<string>();
  for (const id of Object.values(gear.equipped)) if (id) ids.add(id);
  for (const loadout of gear.loadouts) for (const id of Object.values(loadout.equipped)) if (id) ids.add(id);
  return ids;
}

/** What the forge can do with a copy (the gear page's Upgrade button goes by it too). */
export type Plan =
  | { kind: 'refine'; refine: GearRefine }
  | { kind: 'done' }
  /** A bot from before refining on the site. */
  | { kind: 'unavailable' };

export function forgePlan(copy: GearCopy): Plan {
  if (copy.level < copy.maxLevel) return copy.refine ? { kind: 'refine', refine: copy.refine } : { kind: 'unavailable' };
  return { kind: 'done' };
}

/**
 * A stat row as the site shows it: the bot's, or one the heroes page makes itself, which may show a picture (`icon`) for
 * its value, and with its base what its gear and the rest add to it (`added`: "+ 9.5%", or "− 2%" where it costs some).
 */
export type ShownStatRow = StatRow & { icon?: string; added?: string };
export interface ShownStatSection {
  title: string;
  rows: ShownStatRow[];
}
