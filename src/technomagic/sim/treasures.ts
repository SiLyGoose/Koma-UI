import type { HeroDef } from './heroes/kit';
import type { PerkDef } from './perks';
import type { Fighter } from './types';
import { atTier } from './unique';

/*
 * The heroes' unique treasures (UTs), as the fight has them. Each hero has four, King's Raid's own: one for each of
 * its skills and its passive (UT1 to UT4: its HeroDef.treasures, in order), each its own effect on that skill at its
 * tier (1 to 5: as far as its copy is refined, R1 to R5, as a unique weapon's: kingsraid.shodyra.com's 1★ to 5★; its 0★ is
 * left out). As in King's Raid, a hero wears one in its treasure slot (its main treasure) and up to three more beside it
 * (its sub treasures), and only its main treasure's effect is on: the others give it their options (stats) and nothing
 * else, which the bot counts in with its gear. So the bot says only its main treasure, as the fight begins (Entry.ut).
 *
 * A treasure's effect is a perk (./perks.ts), in King's Raid's words, its numbers written once: what a perk's fields say,
 * ./fight.ts does (most of them are its skill's: what it costs, its cooldown, its DMG, what it leaves on the boss, what it
 * gives its hero as it is used); the rest its hero's part does (./heroes/), by its tier (treasureTier). As a perk's, what
 * can't happen in this raid does nothing (there is one enemy, the boss, and it isn't a hero; it has no mana).
 */

/** A unique treasure: its name, and its effect at a tier (its stars, 0★ to 5★). */
export interface TreasureDef {
  name: string;
  at(tier: number): PerkDef;
}

/** The most stars a treasure is awakened to: its tiers are 0★ to this. */
export const TREASURE_TIERS = 5;

/**
 * A unique treasure whose effect is `effect`, given its tier's numbers: `k(row)` is a row's number at the tier (the
 * row's 0★ to 5★).
 */
export const treasure = (name: string, effect: (k: (row: readonly number[]) => number) => PerkDef): TreasureDef => ({
  name,
  at: (tier) => effect((row) => atTier(row, tier)),
});

/** A hero's main treasure as it fights: which of its four (0 to 3), at which tier; null: none, or one this fight doesn't know. */
export function treasureOf(def: HeroDef, ut: { skill: number; tier: number } | null | undefined): { index: number; tier: number } | null {
  if (!ut || !Number.isInteger(ut.skill) || typeof ut.tier !== 'number' || !Number.isFinite(ut.tier)) return null;
  const index = ut.skill - 1;
  if (!def.treasures?.[index]) return null;
  return { index, tier: Math.min(TREASURE_TIERS, Math.max(0, Math.floor(ut.tier))) };
}

/** The tier of a hero's main treasure (its stars, 0★ to 5★) when it is its `index`th (0 to 3), else -1: what its part reads its own numbers by. */
export const treasureTier = (self: Pick<Fighter, 'treasure'>, index: number): number => (self.treasure?.index === index ? self.treasure.tier : -1);

/** Whether a hero's main treasure is its `index`th (0 to 3), at any stars. */
export const wearsTreasure = (self: Pick<Fighter, 'treasure'>, index: number): boolean => self.treasure?.index === index;

/** A hero's main treasure's number in `row` when it is its `index`th, else `none`. */
export const fromTreasure = (self: Pick<Fighter, 'treasure'>, index: number, row: readonly number[], none = 0): number => {
  const tier = treasureTier(self, index);
  return tier >= 0 ? atTier(row, tier) : none;
};

/** A hero's treasures' names, and what one does at a tier, as the bot says them (null: no such hero or treasure). */
export function treasureAbout(hero: HeroDef | undefined, skill: number, tier: number): { name: string; text: string } | null {
  const def = hero?.treasures?.[skill - 1];
  return def ? { name: def.name, text: def.at(tier).words } : null;
}
