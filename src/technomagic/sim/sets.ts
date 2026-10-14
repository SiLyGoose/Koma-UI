import type { Buff } from '../hud/buff';
import type { HeroClass } from '../heroes/kit';
import { SECTION } from './rules';

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

const ABOUT: Record<TmSet, Partial<Record<SetRole, string>>> = {
  perseverance: {
    dps: 'Set effect: +10% DMG, and another +1.5% every 10 seconds (up to +25% after 100 seconds).',
    support: 'Set effect: every ally +5% ATK and +10% defense.',
  },
  hope: {
    support: 'Set effect: every ally +5% ATK and +10% defense.',
    knight: 'Set effect: takes 10% less, and takes 20% of what the boss deals every other ally.',
  },
  authority: {
    dps: 'Set effect: +500 penetration.',
    support: 'Set effect: +2 mana sections at the start; the ally with the highest ATK can’t be knocked down for 15 seconds.',
    knight: 'Set effect: +30% CC resist; its skills strip what helps the boss.',
  },
};

/** A hero's set, as a square on its card. */
export const setBuff = ({ id, role }: { id: TmSet; role: SetRole }): Buff => ({ name: `${NAMES[id]} set`, about: ABOUT[id][role], icon: ICONS[id] });

/** What Authority's support puts on the ally with the highest ATK. */
export const GUARDED: Buff = { name: 'Authority', about: 'Can’t be knocked down.', icon: '⚡' };
