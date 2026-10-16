import type { Span } from '../motion';

/*
 * Every move a hero can make, by name, and how the fight times each one that is written in code: the moments
 * (seconds into it) its blows land, and when it is over. The page draws each with poses (../../heroes/moves/,
 * fitted to these), or with a skin's animations where its hero has its own timing for them (HeroDef.timing).
 */

export type HeroMove =
  | 'attack'
  | 'cast'
  | 'judgment'
  | 'haze'
  | 'flower'
  | 'slam'
  | 'bash'
  | 'guard'
  | 'swing'
  | 'smite'
  | 'light'
  | 'blessing'
  | 'vengeance'
  | 'nudge'
  | 'pochi'
  | 'puchi'
  | 'pippi'
  | 'sleep'
  | 'zap'
  | 'ray'
  | 'treatment'
  | 'elimination'
  | 'cleave'
  | 'burning'
  | 'hellfire'
  | 'eruption'
  | 'splash'
  | 'droplets'
  | 'bubble'
  | 'festival'
  | 'petals'
  | 'blossom'
  | 'scatter'
  | 'moon'
  | 'claw'
  | 'instinct'
  | 'despair'
  | 'doom'
  | 'lash'
  | 'thornbush'
  | 'vine'
  | 'wrath'
  | 'bolt'
  | 'prototype'
  | 'field'
  | 'cannon'
  | 'havoc'
  | 'storm'
  | 'wave'
  | 'surge'
  | 'doomsday'
  | 'arrow'
  | 'rain'
  | 'rush'
  | 'flash'
  | 'snipe'
  | 'eliminate'
  | 'struggle'
  | 'gods'
  | 'chime'
  | 'fracture'
  | 'fragments'
  | 'distortion'
  | 'hew'
  | 'collision'
  | 'headbutt'
  | 'incarnate'
  | 'talon'
  | 'winds'
  | 'reading'
  | 'dive';

/** `count` blows, the first `first` seconds in and each `every` after the last. */
const every = (count: number, first: number, step: number): number[] => Array.from({ length: count }, (_, i) => first + i * step);

/** Each move written in code: the ones every hero has (its attack, a plain cast, being hit), then each hero's own. */
export const CODED: Readonly<Record<HeroMove | 'hit', Span>> = {
  attack: { lands: [0.3, 0.51, 0.93, 1.17, 1.77], until: 2.7 },
  cast: { lands: [1], until: 1.6 },
  hit: { lands: [], until: 0.6 },
  // Kirze.
  judgment: { lands: [0.3, 0.44, 0.58, 0.72, 0.86, 1, 1.14, 1.6], until: 2.4 },
  haze: { lands: [0.62], until: 1.6 },
  flower: { lands: [0.47, 1.1], until: 1.8 },
  // Klaus.
  slam: { lands: [0.78], until: 1.6 },
  bash: { lands: [0.4], until: 1.1 },
  guard: { lands: [0.5], until: 1.5 },
  swing: { lands: [0.3, 0.6], until: 1.15 },
  // Fallen Frey.
  smite: { lands: [0.4], until: 1 },
  light: { lands: [0.55, 1.05], until: 1.7 },
  blessing: { lands: [0.6], until: 1.45 },
  vengeance: { lands: every(20, 0.7, 0.12), until: 3.85 },
  // Gremory.
  nudge: { lands: [0.54], until: 1.43 },
  pochi: { lands: every(5, 0.5, 0.2), until: 1.95 },
  puchi: { lands: [0.8], until: 1.4 },
  pippi: { lands: every(10, 0.6, 0.15), until: 2.6 },
  sleep: { lands: [0.8], until: 3.55 },
  // Annette.
  zap: { lands: [0.45], until: 1 },
  ray: { lands: [0.75], until: 1.5 },
  treatment: { lands: [0.6], until: 1.4 },
  elimination: { lands: [1], until: 1.8 },
  // Morrah.
  cleave: { lands: [0.3, 0.6], until: 1.15 },
  burning: { lands: [0.76], until: 1.5 },
  hellfire: { lands: [0.55], until: 1.5 },
  eruption: { lands: [0.84], until: 1.75 },
  // Laias.
  splash: { lands: [0.42], until: 1 },
  droplets: { lands: [0.6], until: 1.3 },
  bubble: { lands: [0.62], until: 1.3 },
  festival: { lands: [1], until: 1.8 },
  // Seria.
  petals: { lands: [0.33], until: 0.9 },
  blossom: { lands: [0.37], until: 0.95 },
  scatter: { lands: [0.31, 0.49, 0.67], until: 1.3 },
  moon: { lands: [1.06], until: 1.8 },
  // Ezekiel.
  claw: { lands: [0.4], until: 1 },
  instinct: { lands: [0.47, 1.07], until: 1.85 },
  despair: { lands: [0.56], until: 1.3 },
  doom: { lands: [1.02], until: 1.75 },
  // Lorraine.
  lash: { lands: [0.42], until: 1 },
  thornbush: { lands: [0.46, 0.71, 0.96], until: 1.4 },
  vine: { lands: [0.56], until: 1.3 },
  wrath: { lands: [0.96], until: 1.8 },
  // Valance.
  bolt: { lands: [0.42], until: 1 },
  prototype: { lands: [0.62], until: 1.3 },
  field: { lands: [0.68], until: 1.45 },
  cannon: { lands: every(10, 0.8, 0.15), until: 2.6 },
  // Lucikiel.
  havoc: { lands: [0.45], until: 1.05 },
  storm: { lands: [0.5, 0.75, 1], until: 1.5 },
  wave: { lands: [0.5, 0.95], until: 1.5 },
  surge: { lands: [0.55, 1.05], until: 1.65 },
  doomsday: { lands: every(9, 0.6, 0.15), until: 2.5 },
  // Selene.
  arrow: { lands: [0.45], until: 1 },
  rain: { lands: every(12, 0.7, 0.08), until: 2.1 },
  rush: { lands: every(5, 0.45, 0.1), until: 1.3 },
  flash: { lands: [1], until: 1.7 },
  // Crow (his Frost Bullet the last of Struggle is Meaningless's blows).
  snipe: { lands: [0.4], until: 1 },
  eliminate: { lands: every(15, 0.45, 0.07), until: 1.9 },
  struggle: { lands: [...every(10, 0.4, 0.08), 1.4], until: 2 },
  gods: { lands: [1.7], until: 2.4 },
  // Oddy.
  chime: { lands: [0.42], until: 1 },
  fracture: { lands: [0.6], until: 1.3 },
  fragments: { lands: every(6, 0.5, 0.15), until: 1.7 },
  distortion: { lands: [1], until: 1.8 },
  // Phillop.
  hew: { lands: [0.45], until: 1.1 },
  collision: { lands: [0.6], until: 1.4 },
  headbutt: { lands: [0.5], until: 1.2 },
  incarnate: { lands: [0.8], until: 1.6 },
  // Naila.
  talon: { lands: [0.35], until: 0.9 },
  winds: { lands: [0.45, 1.05], until: 1.6 },
  reading: { lands: [0.6], until: 1.3 },
  dive: { lands: [1], until: 1.7 },
};
