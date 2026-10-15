import { tierRank } from './items';
import type { GearCopy, GearForge, GearRefine, GearView, StatRow } from '../../protocol/gear';

/** A member's gear as the bot says it (../../protocol/gear.ts). */
export type { ForgeBlock, GearCopy, GearForge, GearLoadout, GearRefine, GearView, RefineBlock, StatRow, StatSection } from '../../protocol/gear';


/*
 * What the bot's /api/gear answers (its web/gear.ts), for the pages that show a member's gear: the gear
 * page and the forge.
 */

/**
 * The copies in the order the armories show them: by star tier (4 stars first), then by name, A to Z
 * (so an item's copies sit together), then each item's copies from the most refined down (a
 * masterwork first at the same level).
 */
export function armoryOrder(copies: readonly GearCopy[]): GearCopy[] {
  // TechnoMagic gear first: a tier of its own, above 4 stars; then the unique weapons.
  const tier = tierRank;
  return [...copies].sort(
    (a, b) =>
      tier(b) - tier(a) ||
      a.name.localeCompare(b.name) ||
      a.itemId.localeCompare(b.itemId) ||
      b.level - a.level ||
      Number(b.masterwork) - Number(a.masterwork) ||
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

/** How the bot starts the line for a masterwork bonus still waiting to be forged (its TEXT.gear.bonusDormant). */
export const DORMANT = '🔒 Masterwork';

/** What the forge can do with a copy (the gear page's Upgrade button goes by it too). */
export type Plan =
  | { kind: 'refine'; refine: GearRefine }
  /** `forge` is null when the bot can't forge on the site yet (only in Discord). */
  | { kind: 'forge'; forge: GearForge | null }
  | { kind: 'done'; masterwork: boolean }
  /** A bot from before refining on the site. */
  | { kind: 'unavailable' };

export function forgePlan(copy: GearCopy): Plan {
  if (copy.level < copy.maxLevel) return copy.refine ? { kind: 'refine', refine: copy.refine } : { kind: 'unavailable' };
  if (copy.masterwork) return { kind: 'done', masterwork: true };
  // No bonus to awaken.
  if (copy.forge === null) return { kind: 'done', masterwork: false };
  if (copy.forge) return copy.forge.blocked === 'forged' ? { kind: 'done', masterwork: true } : { kind: 'forge', forge: copy.forge };
  return copy.effects.some((line) => line.startsWith(DORMANT)) ? { kind: 'forge', forge: null } : { kind: 'done', masterwork: false };
}

/** A stat row as the site shows it: the bot's, or one the heroes page makes itself, which may show a picture (`icon`) for its value. */
export type ShownStatRow = StatRow & { icon?: string };
export interface ShownStatSection {
  title: string;
  rows: ShownStatRow[];
}
