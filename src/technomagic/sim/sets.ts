import { POINTS } from './combat/damage';
import type { HeroClass } from './heroes/kit';
import { SECTION } from './rules';
import { fine, pct, type Buff } from './shown';

/*
 * The TechnoMagic Raids' gear sets, as the fight has them: a hero wearing three of a set's pieces (of its weapons and
 * armors: the bot says which set, if any, as the fight begins) has its effect, which depends on its class:
 * the frontline's tank (knight), the supports (Hope and Authority count mechanics with the priests; Perseverance
 * its priests and knights), and the damage dealers (everyone else). One boss drops each: Galgoria Perseverance, Siegfried Hope,
 * Ascalon Authority. ./fight.ts applies them.
 *
 * - Perseverance: a damage dealer deals 10% more DMG, and another 1.5% more every 10 seconds, ten times over
 *   (25% more after 100 seconds); a support (its priests and knights) gives every ally +5% ATK and +10% defense,
 *   again for each wearing it.
 * - Hope: a support gives every ally +5% ATK and +10% defense, again for each wearing it; a knight takes 10%
 *   less, and takes a share of what the boss deals every other ally on itself.
 * - Authority: a damage dealer sees past 500 more of the boss's defense (its kills, in a fight with only the
 *   boss, there are none of); a support starts with 2 more mana sections, and the ally with the highest ATK
 *   can't be knocked down for a while; a knight's CC resist +300, and its skills strip what helps the boss.
 */

export type TmSet = 'perseverance' | 'hope' | 'authority';
export type SetRole = 'dps' | 'support' | 'knight';

export const TM_SETS: readonly TmSet[] = ['perseverance', 'hope', 'authority'];

/** What each class is, for each set (a class the set does nothing for is left out). */
const ROLES: Record<TmSet, Partial<Record<HeroClass, SetRole>>> = {
  perseverance: { warrior: 'dps', assassin: 'dps', archer: 'dps', mechanic: 'dps', wizard: 'dps', priest: 'support', knight: 'support' },
  hope: { priest: 'support', mechanic: 'support', knight: 'knight' },
  authority: { warrior: 'dps', assassin: 'dps', archer: 'dps', wizard: 'dps', priest: 'support', mechanic: 'support', knight: 'knight' },
};

/** A hero's set as it fights: which, and what its class is to it (null: no set, or one that does nothing for its class). */
export function setOf(set: string | null | undefined, heroClass: HeroClass): { id: TmSet; role: SetRole } | null {
  if (!set || !(TM_SETS as readonly string[]).includes(set)) return null;
  const role = ROLES[set as TmSet][heroClass];
  return role ? { id: set as TmSet, role } : null;
}

export const PERSEVERANCE = {
  /** A damage dealer's DMG: so much more at once, and `step` more every `every` seconds, `most` times. */
  dmg: 0.1,
  step: 0.015,
  every: 10,
  most: 10,
  /** What each support wearing it gives every ally. */
  atk: 0.05,
  defense: 0.1,
};

export const HOPE = {
  /** What each support wearing it gives every ally. */
  atk: 0.05,
  defense: 0.1,
  /** A knight: what it takes, and the share of what the boss deals every other ally that it takes instead. */
  taken: 0.9,
  covers: 0.2,
};

export const AUTHORITY = {
  /** A damage dealer's penetration (points). */
  pen: 500,
  /** A support's mana at the start, and how long the ally with the highest ATK can't be knocked down. */
  mana: 2 * SECTION,
  guardFor: 15,
  /** A knight's CC resist (points). */
  resist: 300,
};

const NAMES: Record<TmSet, string> = { perseverance: 'Perseverance', hope: 'Hope', authority: 'Authority' };
const ICONS: Record<TmSet, string> = { perseverance: '⚔️', hope: '🛡️', authority: '⚡' };

/** What a support of Perseverance's or Hope's gives every ally. */
const ALLIES = (set: { atk: number; defense: number }): string => `every ally +${pct(set.atk)} ATK and +${pct(set.defense)} defense (again for every other hero wearing it so)`;

/** What each set does for a hero in each role it has: its card says it, and the bot (its pieces, and the heroes page). */
const ABOUT: Record<TmSet, Partial<Record<SetRole, string>>> = {
  perseverance: {
    dps: `+${pct(PERSEVERANCE.dmg)} DMG, and another +${fine(PERSEVERANCE.step)} every ${PERSEVERANCE.every} seconds (up to +${pct(PERSEVERANCE.dmg + PERSEVERANCE.step * PERSEVERANCE.most)} after ${PERSEVERANCE.every * PERSEVERANCE.most} seconds)`,
    support: ALLIES(PERSEVERANCE),
  },
  hope: {
    support: ALLIES(HOPE),
    knight: `takes ${pct(1 - HOPE.taken)} less, and takes ${pct(HOPE.covers)} of what the boss deals every other ally`,
  },
  authority: {
    dps: `+${AUTHORITY.pen} penetration`,
    support: `+${AUTHORITY.mana / SECTION} mana sections at the start; the ally with the highest ATK can’t be knocked down for ${AUTHORITY.guardFor} seconds`,
    knight: `+${pct(AUTHORITY.resist / POINTS)} CC resist; its skills strip what helps the boss`,
  },
};

/** A hero's set, as a square on its card. */
export const setBuff = ({ id, role }: { id: TmSet; role: SetRole }): Buff => ({ name: `${NAMES[id]} set`, about: `Set effect: ${ABOUT[id][role]}.`, icon: ICONS[id] });

/** Each set as the bot has it: its name and icon, and what it does for a hero of each class wearing three of its pieces (a class it does nothing for left out). */
export const SET_INFO: readonly { id: TmSet; name: string; icon: string; effects: Partial<Record<HeroClass, string>> }[] = TM_SETS.map((id) => ({
  id,
  name: NAMES[id],
  icon: ICONS[id],
  effects: Object.fromEntries(Object.entries(ROLES[id]).map(([heroClass, role]) => [heroClass, ABOUT[id][role]])),
}));

/** What Authority's support puts on the ally with the highest ATK. */
export const GUARDED: Buff = { name: 'Authority', about: 'Can’t be knocked down.', icon: '⚡' };
