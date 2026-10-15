import type { HeroMove } from '../../sim/heroes/moves';
import { ELIMINATION, RAY, TREATMENT, ZAP } from '../annette/moves';
import { BASH, GUARD, SLAM, SWING } from '../clause/moves';
import { CLAW, DESPAIR, DOOM, INSTINCT } from '../ezekiel/moves';
import { BLESSING, LIGHT, SMITE, VENGEANCE } from '../fallen-frey/moves';
import { NUDGE, PIPPI, POCHI, PUCHI, SLEEP } from '../gremory/moves';
import { FLOWER, HAZE, JUDGMENT } from '../kirze/moves';
import { BUBBLE, DROPLETS, FESTIVAL, SPLASH } from '../laias/moves';
import { LASH, THORNBUSH, VINE, WRATH } from '../lorraine/moves';
import { BURNING, CLEAVE, ERUPTION, HELLFIRE } from '../morrah/moves';
import { BLOSSOM, MOON, PETALS, SCATTER } from '../seria/moves';
import { BOLT, CANNON, FIELD, PROTOTYPE } from '../valance/moves';
import { ATTACK, CAST, HIT } from './common';
import type { Move } from './move';

/*
 * Every move a hero's body can make, by name: the ones all have (./common.ts) and each hero's own
 * (../kirze/moves.ts, ../clause/moves.ts, ../fallen-frey/moves.ts, ../gremory/moves.ts, ../annette/moves.ts, ../morrah/moves.ts, ../laias/moves.ts, ../seria/moves.ts, ../ezekiel/moves.ts, ../lorraine/moves.ts, ../valance/moves.ts), written with the stances in ./stances.ts. Each is
 * written to fit how the fight times it (../../sim/heroes/moves.ts).
 */

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
  cleave: CLEAVE,
  burning: BURNING,
  hellfire: HELLFIRE,
  eruption: ERUPTION,
  splash: SPLASH,
  droplets: DROPLETS,
  bubble: BUBBLE,
  festival: FESTIVAL,
  petals: PETALS,
  blossom: BLOSSOM,
  scatter: SCATTER,
  moon: MOON,
  claw: CLAW,
  instinct: INSTINCT,
  despair: DESPAIR,
  doom: DOOM,
  lash: LASH,
  thornbush: THORNBUSH,
  vine: VINE,
  wrath: WRATH,
  bolt: BOLT,
  prototype: PROTOTYPE,
  field: FIELD,
  cannon: CANNON,
  hit: HIT,
};

export { flowing, type Move } from './move';
export type { HeroMove };
