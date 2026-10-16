import type { HeroMove } from '../../sim/heroes/moves';
import { ELIMINATION, RAY, TREATMENT, ZAP } from '../annette/moves';
import { BASH, GUARD, SLAM, SWING } from '../klaus/moves';
import { CLAW, DESPAIR, DOOM, INSTINCT } from '../ezekiel/moves';
import { BLESSING, LIGHT, SMITE, VENGEANCE } from '../fallen-frey/moves';
import { NUDGE, PIPPI, POCHI, PUCHI, SLEEP } from '../gremory/moves';
import { FLOWER, HAZE, JUDGMENT } from '../kirze/moves';
import { BUBBLE, DROPLETS, FESTIVAL, SPLASH } from '../laias/moves';
import { LASH, THORNBUSH, VINE, WRATH } from '../lorraine/moves';
import { BURNING, CLEAVE, ERUPTION, HELLFIRE } from '../morrah/moves';
import { BLOSSOM, MOON, PETALS, SCATTER } from '../seria/moves';
import { BOLT, CANNON, FIELD, PROTOTYPE } from '../valance/moves';
import { DOOMSDAY, HAVOC, STORM, SURGE, WAVE } from '../lucikiel/moves';
import { ARROW, FLASH, RAIN, RUSH } from '../selene/moves';
import { ELIMINATE, GODS, SNIPE, STRUGGLE } from '../crow/moves';
import { CHIME, DISTORTION, FRACTURE, FRAGMENTS } from '../oddy/moves';
import { COLLISION, HEADBUTT, HEW, INCARNATE } from '../phillop/moves';
import { DIVE, READING, TALON, WINDS } from '../naila/moves';
import { ATTACK, CAST, HIT } from './common';
import type { Move } from './move';

/*
 * Every move a hero's body can make, by name: the ones all have (./common.ts) and each hero's own
 * (../kirze/moves.ts, ../klaus/moves.ts, ../fallen-frey/moves.ts, ../gremory/moves.ts, ../annette/moves.ts, ../morrah/moves.ts, ../laias/moves.ts, ../seria/moves.ts, ../ezekiel/moves.ts, ../lorraine/moves.ts, ../valance/moves.ts, ../lucikiel/moves.ts, ../selene/moves.ts, ../crow/moves.ts, ../oddy/moves.ts, ../phillop/moves.ts, ../naila/moves.ts), written with the stances in ./stances.ts. Each is
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
  havoc: HAVOC,
  storm: STORM,
  wave: WAVE,
  surge: SURGE,
  doomsday: DOOMSDAY,
  arrow: ARROW,
  rain: RAIN,
  rush: RUSH,
  flash: FLASH,
  snipe: SNIPE,
  eliminate: ELIMINATE,
  struggle: STRUGGLE,
  gods: GODS,
  chime: CHIME,
  fracture: FRACTURE,
  fragments: FRAGMENTS,
  distortion: DISTORTION,
  hew: HEW,
  collision: COLLISION,
  headbutt: HEADBUTT,
  incarnate: INCARNATE,
  talon: TALON,
  winds: WINDS,
  reading: READING,
  dive: DIVE,
  hit: HIT,
};

export { flowing, type Move } from './move';
export type { HeroMove };
