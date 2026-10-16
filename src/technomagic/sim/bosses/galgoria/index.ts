import { NONE } from '../../combat/damage';
import type { BossDef, BossScale } from '../boss';
import { ATTACKS, MOVES, PLANS } from './attacks';
import { galgoriaPart } from './skills';

/**
 * Its health at each stage, alone (so many times its own), and with more than one player (ROOM_HP times that, for
 * the eighth hero and the auras every other hero's gear adds); and how hard its blows are, either way.
 */
const SOLO_HP = [1.4, 2.3, 4, 6.5, 9.5, 13, 17, 22.5];
const ROOM_HP = 1.7;
const DEALS = [2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75];
const scales = (times: number): BossScale[] => SOLO_HP.map((hp, i) => ({ hp: hp * times, deals: DEALS[i] as number }));

/**
 * Galgoria: a chimera of three heads that spits venom. Its blows are magical. It stands physical blows
 * less well than magical ones, and neither blocks nor dodges. (Its defenses are a first guess, King's Raid's size of
 * DEF: the game's are not known here. They take off what they did before the fight had the game's formula, 38% of a
 * physical blow and 44% of a magical one.) How its attacks go is ./attacks.ts, and what its skills do ./skills.ts; what is drawn for them is
 * ../../../bosses/galgoria/fx.ts, and its body ../../../bosses/galgoria/model.ts.
 *
 * Made to want gear, more at each stage (its health and blows: SOLO_HP, ROOM_HP, DEALS). Tried in fights with every hero
 * on Auto (a knight, a priest and damage dealers; 7 heroes alone, 8 in a room), each stage is won about four times in
 * five by heroes geared for it, and hardly ever by those geared for the stage before last:
 * - Stage 1: 4-star raid gear and their unique weapons (without those, or with no gear, never).
 * - Stage 4: a TechnoMagic set with some of the stats their class wants, and unique weapons refined a little.
 * - Stage 8: nearly maxed: unique weapons at R5, and TechnoMagic gear rolled high on the stats their class wants,
 *   with good additional skills (about half of such parties win, and the right lineup tells).
 * Its defenses are high enough that penetration tells. Now and then a blow of its is a crit (crit resist tells), and its CC
 * resist cuts a stun on it short (accuracy tells): first guesses too.
 */
export const GALGORIA: BossDef = {
  id: 'galgoria',
  name: 'Galgoria',
  stats: { hp: 100_000_000, deals: 'magical', physical: 12_000, magical: 16_000, block: NONE, dodge: NONE, crit: 100, resist: 150 },
  stages: { room: scales(ROOM_HP), solo: scales(1) },
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: galgoriaPart,
};
