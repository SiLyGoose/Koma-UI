import type { HeroClass } from './heroes/kit';
import { KR_SETS } from './gear/kr-data';
import { stateArt, type Buff } from './shown';
import type { GearBonus } from './types';

/*
 * The TechnoMagic Raids' gear sets, as King's Raid's CBT2 playtest has them (./gear/kr-data.ts): a hero wearing four of a
 * set's pieces (its Armor, Mantle, Accessory and Orb: the bot says which set, if any, as the fight begins) has
 * the set's skill for its class. One boss drops each: Galgoria Perseverance, Siegfried Hope, Ascalon Authority.
 * ./fight.ts applies them. (The dragon sets' bonuses are only stats: the bot adds them to what its gear gives.)
 *
 * - Perseverance: a damage dealer's DMG and ATK (a mechanic's and a wizard's crit DMG) +10%, growing every 2 seconds to
 *   +25% (+50%) after 100; a knight's DMG +10% and its Tough 100, growing every second to +20% and 200 after 50; a
 *   priest's heals and shields +25%.
 * - Hope: every ally's ATK Spd, crit DMG, DMG, DEF and ATK, healing and mana (each class something), and a mechanic's
 *   mana and cooldowns for every ally every 10 seconds; an assassin's mana and crit DMG as it uses a skill.
 * - Authority: each its own: a knight's block and cooldowns on blocking, a warrior's HP and a second wind, an assassin's
 *   penetration and DMG past DEF, an archer's ATK, a mechanic's crit chance (every blow a crit from 1400), a wizard's ATK
 *   and mana once its mana is first full, and every ally's ATK from a priest.
 */

export type TmSet = 'perseverance' | 'hope' | 'authority';

export const TM_SETS: readonly TmSet[] = ['perseverance', 'hope', 'authority'];

/** The pieces of a set a hero wears for its effect. */
export const SET_PIECES = 4;

/**
 * What a set does for a hero of a class (shares: 0.1 is 10%; points: 1000 is 100%; seconds):
 * - `own`: its own stats from the start (as its gear's: GearBonus);
 * - `dmg`: its DMG dealt from the start; `grows`: every `every` seconds, so much more DMG, ATK, crit DMG and Tough, `most` times;
 * - `allies`: what every ally on the field gains (each wearer's, added up): ATK, DEF, ATK Spd (points), crit DMG, DMG, healing
 *   received, and mana recovery from `manaAfter` seconds on; ATK Spd twice over for the front line (`twice: 'front'`) or crit DMG
 *   for the rest (`twice: 'back'`);
 * - `top`: after `after` seconds, the ally who has dealt the most deals `dmg` more for the rest of the fight;
 * - `tick`: every `every` seconds, every ally on the field gains `mana` and its skills' cooldowns are `cooldown` seconds shorter;
 * - `onSkill`: as it uses a skill, it gains `mana`, and its crit DMG `critDamage` more for `lasts` seconds;
 * - `onBlock`: as it blocks, its skills' cooldowns are `cooldown` seconds shorter (once every `wait` seconds);
 * - `secondWind`: the first time its health falls below `below`, it heals `heal` of its max HP and its ATK Spd is `speed` more for good;
 * - `opening`: its ATK `atk` more for the first `lasts` seconds;
 * - `allCrit`: every blow of its a crit, should its crit chance be `at` or more;
 * - `fullMana`: the first time its mana is full, its mana recovery and ATK so much more for good;
 * - `pastDef`: its DMG that goes past DEF so much more.
 */
export interface SetEffect {
  own?: GearBonus;
  dmg?: number;
  grows?: { every: number; most: number; dmg?: number; atk?: number; critDamage?: number; tough?: number };
  allies?: { atk?: number; defense?: number; speed?: number; critDamage?: number; dmg?: number; recovery?: number; mana?: number; manaAfter?: number; twice?: 'front' | 'back' };
  top?: { after: number; dmg: number };
  tick?: { every: number; mana: number; cooldown: number };
  onSkill?: { mana: number; critDamage: number; lasts: number };
  onBlock?: { cooldown: number; wait: number };
  secondWind?: { below: number; heal: number; speed: number };
  opening?: { atk: number; lasts: number };
  allCrit?: { at: number };
  fullMana?: { mana: number; atk: number };
  pastDef?: number;
}

/** Perseverance's growing DMG and ATK, King's Raid's TechSet_50: every 2 seconds 0.3% more, 50 times. */
const GROWS = { every: 2, most: 50, dmg: 0.003 };

/** Each set's skill for each class: King's Raid's (EquipSetBonusTable's 4-piece UseSkill, SkillTable's numbers). */
export const SET_EFFECTS: Readonly<Record<TmSet, Readonly<Record<HeroClass, SetEffect>>>> = {
  perseverance: {
    knight: { dmg: 0.1, own: { tough: 100 }, grows: { every: 1, most: 50, dmg: 0.002, tough: 2 } },
    warrior: { dmg: 0.1, own: { atk: 0.1 }, grows: { ...GROWS, atk: 0.003 } },
    assassin: { dmg: 0.1, own: { atk: 0.1 }, grows: { ...GROWS, atk: 0.003 } },
    archer: { dmg: 0.1, own: { atk: 0.1 }, grows: { ...GROWS, atk: 0.003 } },
    mechanic: { dmg: 0.1, own: { critDamage: 0.2 }, grows: { ...GROWS, critDamage: 0.006 } },
    wizard: { dmg: 0.1, own: { critDamage: 0.2 }, grows: { ...GROWS, critDamage: 0.006 } },
    priest: { own: { heal: 0.25 } },
  },
  hope: {
    knight: { allies: { defense: 0.1, atk: 0.05 } },
    warrior: { allies: { speed: 100, twice: 'front' } },
    assassin: { own: { critDamage: 0.4 }, onSkill: { mana: 300, critDamage: 0.4, lasts: 3 } },
    archer: { allies: { critDamage: 0.2, twice: 'back' } },
    mechanic: { tick: { every: 10, mana: 500, cooldown: 0.5 } },
    wizard: { allies: { dmg: 0.02 }, top: { after: 30, dmg: 0.02 } },
    priest: { allies: { recovery: 0.06, mana: 0.06, manaAfter: 5 } },
  },
  authority: {
    knight: { own: { block: 300 }, onBlock: { cooldown: 1, wait: 2.5 } },
    warrior: { own: { hp: 0.3 }, secondWind: { below: 0.5, heal: 0.3, speed: 300 } },
    assassin: { own: { pen: 250 }, pastDef: 0.12 },
    archer: { own: { atk: 0.25 }, opening: { atk: 0.25, lasts: 20 } },
    mechanic: { own: { crit: 300 }, allCrit: { at: 1400 } },
    wizard: { fullMana: { mana: 0.2, atk: 0.4 } },
    priest: { allies: { atk: 0.1 } },
  },
};

/** A hero's set as it fights: which, and what it does for its class (null: no set). */
export function setOf(set: string | null | undefined, heroClass: HeroClass): { id: TmSet; effect: SetEffect } | null {
  if (!set || !(TM_SETS as readonly string[]).includes(set)) return null;
  return { id: set as TmSet, effect: SET_EFFECTS[set as TmSet][heroClass] };
}

/** How many stacks of a set's growing effect it has `elapsed` seconds into the fight. */
export const grown = (effect: SetEffect, elapsed: number): number => (effect.grows ? Math.min(effect.grows.most, Math.floor(elapsed / effect.grows.every)) : 0);

const NAMES: Record<TmSet, string> = { perseverance: 'Perseverance', hope: 'Hope', authority: 'Authority' };
const ICONS: Record<TmSet, string> = { perseverance: '⚔️', hope: '🛡️', authority: '⚡' };

/** What a set does for each class, in King's Raid's words. */
const about = (id: TmSet, heroClass: HeroClass): string => (KR_SETS[id]?.four as Partial<Record<HeroClass, { text: string }>> | undefined)?.[heroClass]?.text ?? '';

/** A hero's set, as a square on its card. */
export const setBuff = ({ id }: { id: TmSet }, heroClass: HeroClass): Buff => ({ name: `${NAMES[id]} set`, about: `Set effect: ${about(id, heroClass)}`, icon: ICONS[id] });

/** Each set as the bot has it: its name and icon, and what it does for a hero of each class wearing four of its pieces. */
export const SET_INFO: readonly { id: TmSet; name: string; icon: string; effects: Partial<Record<HeroClass, string>> }[] = TM_SETS.map((id) => ({
  id,
  name: NAMES[id],
  icon: ICONS[id],
  effects: Object.fromEntries((Object.keys(SET_EFFECTS[id]) as HeroClass[]).map((heroClass) => [heroClass, about(id, heroClass)])),
}));

/** What a set's triggered effects put on their wearer: shown on its card. */
export const SET_UP = {
  onSkill: { name: 'Hope', about: 'More crit DMG.', icon: '🛡️', art: stateArt('AttackUp') },
  secondWind: { name: 'Authority', about: 'ATK Spd up for good.', icon: '⚡', art: stateArt('SpeedUp') },
  fullMana: { name: 'Authority', about: 'Mana recovery and ATK up for good.', icon: '⚡', art: stateArt('AttackUp') },
  top: { name: 'Hope', about: 'Deals more DMG.', icon: '🛡️', art: stateArt('AttackUp') },
} as const satisfies Record<string, Buff>;
