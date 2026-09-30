import type { Slot } from './items';

/*
 * What the bot's /api/gear answers (its web/gear.ts), for the pages that show a member's gear: the gear
 * page and the forge.
 */

/** One copy the member owns (the bot's web/gear.ts GearCopy). */
export interface GearCopy {
  id: string;
  itemId: string;
  name: string;
  stars: 1 | 2 | 3 | 4;
  slot: Slot;
  description: string;
  level: number;
  maxLevel: number;
  masterwork: boolean;
  effects: string[];
  borrowed: number | null;
  /** Refining it, for the forge (absent from a bot from before refining on the site). */
  refine?: GearRefine;
  /** Forging it into a masterwork: null when its item has no bonus (absent from a bot from before forging on the site). */
  forge?: GearForge | null;
  /** Locked by the member: never sold or used up by a refine (absent from a bot from before locking). */
  locked?: boolean;
  /** What selling it pays in zeiucoins: null when it's worn, saved in a loadout or locked, so never sold (absent from a bot from before selling on the site). */
  sell?: number | null;
}

/** Refining a copy (the bot's web/gear.ts GearRefine). */
export interface GearRefine {
  /** Why it can't be done now (null when it can). */
  blocked: RefineBlock | null;
  /** What the next level costs in points (null at the top level). */
  cost: number | null;
  /** The level of the spare copy it would use up when none is picked. */
  spare: number | null;
  /** What it would do at the next level. */
  after: string[] | null;
}

/**
 * Why a copy can't be refined (the bot's web/gear.ts RefineBlock): also the error a refine is refused
 * with. Every copy is refined as itself, whatever level its item's other copies are at.
 */
export type RefineBlock = 'maxed' | 'no_duplicate' | 'too_poor';

/** Forging a copy into a masterwork, awakening its bonus (the bot's web/gear.ts GearForge). */
export interface GearForge {
  /** Why it can't be done now (null when it can). */
  blocked: ForgeBlock | null;
  /** What it costs in komaGems. */
  cost: number;
  /** The level it has to be refined to first. */
  level: number;
  /** What it would do as a masterwork (null when it's one already). */
  after: string[] | null;
}

/** Why a copy can't be forged (the bot's web/gear.ts ForgeBlock): also the error a forge is refused with. */
export type ForgeBlock = 'forged' | 'too_low' | 'too_poor';

/** One of the member's loadouts (the bot's web/gear.ts GearLoadout). */
export interface GearLoadout {
  number: number;
  name: string;
  active: boolean;
  equipped: Record<Slot, string | null>;
}

/** A group of stats on the Common tab (the bot's web/stats.ts StatSection); `base` is the value without gear, when gear changes it. */
export interface StatSection {
  title: string;
  rows: { label: string; value: string; base: string | null }[];
}

export interface GearView {
  equipped: Record<Slot, string | null>;
  copies: GearCopy[];
  totals: string[];
  loadouts: GearLoadout[];
  stats: StatSection[];
  /** Their points in the server (null when not known). */
  balance?: number | null;
  /** Their komaGems in the server (null when not known; absent from a bot from before forging on the site). */
  gems?: number | null;
  /**
   * How a refine or forge just went, in the answer to one: 'fail' when it didn't take (the copy stays as
   * it was). Absent means it worked (a bot from before refines could fail always sends none).
   */
  outcome?: 'success' | 'fail';
  /** What a sale just sold, in the answer to one. */
  sold?: { count: number; earned: number };
}

/**
 * The copies in the order the armories show them: by star tier (4 stars first), then by name, A to Z
 * (so an item's copies sit together), then each item's copies from the most refined down (a
 * masterwork first at the same level).
 */
export function armoryOrder(copies: readonly GearCopy[]): GearCopy[] {
  return [...copies].sort(
    (a, b) =>
      b.stars - a.stars ||
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
