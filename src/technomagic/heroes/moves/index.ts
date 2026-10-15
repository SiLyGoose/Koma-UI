import { ELIMINATION, RAY, TREATMENT, ZAP } from '../annette/moves';
import { BASH, GUARD, SLAM, SWING } from '../clause/moves';
import { BLESSING, LIGHT, SMITE, VENGEANCE } from '../fallen-frey/moves';
import { NUDGE, PIPPI, POCHI, PUCHI, SLEEP } from '../gremory/moves';
import { FLOWER, HAZE, JUDGMENT } from '../kirze/moves';
import { ATTACK, CAST, HIT } from './common';
import type { Move } from './move';

/*
 * Every move a hero's body can make, by name: the ones all have (./common.ts) and each hero's own
 * (../kirze/moves.ts, ../clause/moves.ts, ../fallen-frey/moves.ts, ../gremory/moves.ts, ../annette/moves.ts), written with the stances in ./stances.ts.
 */

export type HeroMove = 'attack' | 'cast' | 'judgment' | 'haze' | 'flower' | 'slam' | 'bash' | 'guard' | 'swing' | 'smite' | 'light' | 'blessing' | 'vengeance' | 'nudge' | 'pochi' | 'puchi' | 'pippi' | 'sleep' | 'zap' | 'ray' | 'treatment' | 'elimination';
export const MOVES: Record<HeroMove | 'hit', Move> = {
  attack: ATTACK,
  cast: CAST,
  judgment: JUDGMENT,
  haze: HAZE,
  flower: FLOWER,
  slam: SLAM,
  bash: BASH,
  guard: GUARD,
  swing: SWING,
  smite: SMITE,
  light: LIGHT,
  blessing: BLESSING,
  vengeance: VENGEANCE,
  nudge: NUDGE,
  pochi: POCHI,
  puchi: PUCHI,
  pippi: PIPPI,
  sleep: SLEEP,
  zap: ZAP,
  ray: RAY,
  treatment: TREATMENT,
  elimination: ELIMINATION,
  hit: HIT,
};

export { flowing, type Move } from './move';
