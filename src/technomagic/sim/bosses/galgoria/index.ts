import { NONE } from '../../combat/damage';
import type { BossDef } from '../boss';
import { ATTACKS, MOVES, PLANS } from './attacks';
import { galgoriaPart } from './skills';

/**
 * Galgoria: a chimera of three heads that spits venom. Its blows are magical. It stands physical blows
 * less well than magical ones, and neither blocks nor dodges. (Its defenses are a first guess: the game's are not
 * known here.) How its attacks go is ./attacks.ts, and what its skills do ./skills.ts; what is drawn for them is
 * ../../../bosses/galgoria/fx.ts, and its body ../../../bosses/galgoria/model.ts.
 *
 * Made to want gear: heroes with none (their class's stats alone) take about a third of its health before
 * the raid's time is up, and want some two and a half times their damage to beat it in time. Its defenses
 * are high enough that penetration tells. Now and then a blow of its is a crit (crit resist tells), and its CC
 * resist cuts a stun on it short (accuracy tells): first guesses too.
 */
export const GALGORIA: BossDef = {
  id: 'galgoria',
  name: 'Galgoria',
  stats: { hp: 3_000_000, deals: 'magical', physical: 600, magical: 800, block: NONE, dodge: NONE, crit: 100, resist: 150 },
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: galgoriaPart,
};
