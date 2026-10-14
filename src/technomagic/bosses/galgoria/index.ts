import { GALGORIA_ASSETS } from '../../assets';
import { NONE } from '../../combat/damage';
import type { BossDef } from '../boss';
import { ATTACKS, MOVES, PLANS } from './attacks';
import { galgoriaPart } from './skills';

/**
 * Galgoria: a chimera of three heads that spits venom. Its blows are magical. It stands physical blows
 * less well than magical ones, and neither blocks nor dodges. (Its defenses are a first guess: the game's are not
 * known here.) How its attacks go is ./attacks.ts, what its skills do ./skills.ts, what is drawn for them
 * ./fx.ts, and its body ./model.ts.
 *
 * Made to want gear: heroes with none (their class's stats alone) take about a third of its health before
 * the raid's time is up, and want some two and a half times their damage to beat it in time. Its defenses
 * are high enough that penetration tells.
 */
export const GALGORIA: BossDef = {
  id: 'galgoria',
  name: 'Galgoria',
  assets: GALGORIA_ASSETS,
  stats: { hp: 3_000_000, deals: 'magical', physical: 600, magical: 800, block: NONE, dodge: NONE },
  // Right of the middle, a hero that fights hand to hand not far in front of it, as in the game: the left of the field is for those who fight from further off.
  stands: { x: 7, turn: -1.1 },
  reach: { hit: [-2.2, 3.4, 3], feet: [-1, 0, 0.6] },
  attacks: ATTACKS,
  plans: PLANS,
  moves: MOVES,
  join: galgoriaPart,
};
