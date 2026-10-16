import { tierRank } from './items';
import type { GearCopy, GearRefine, GearView, StatRow } from '../../protocol/gear';

/** A member's gear as the bot says it (../../protocol/gear.ts). */
export type { GearCopy, GearLoadout, GearRefine, GearView, RefineBlock, StatRow, StatSection } from '../../protocol/gear';


/*
 * What the bot's /api/gear answers (its web/gear.ts), for the pages that show a member's gear: the gear
 * page and the forge.
 */

/**
 * The copies in the order the armories show them: by star tier (4 stars first), then by name, A to Z
 * (so an item's copies sit together), then each item's copies from the most refined down.
 */
export function armoryOrder<C extends { id: string; itemId: string; name: string; level: number; stars: number; heroOnly?: boolean; uniqueWeapon?: string | null; uniqueTreasure?: { hero: string; skill: number } | null }>(copies: readonly C[]): C[] {
  // TechnoMagic gear first: a tier of its own, above 4 stars; then the unique weapons, then the unique treasures.
  const tier = tierRank;
  return [...copies].sort(
    (a, b) =>
      tier(b) - tier(a) ||
      a.name.localeCompare(b.name) ||
      a.itemId.localeCompare(b.itemId) ||
      b.level - a.level ||
      a.id.localeCompare(b.id),
  );
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
