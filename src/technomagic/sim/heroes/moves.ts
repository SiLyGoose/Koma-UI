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
  | 'dive'
  | 'shot'
  | 'focus'
  | 'wipeout'
  | 'unleash'
  | 'maw'
  | 'lightning'
  | 'roar'
  | 'breath'
  | 'drain'
  | 'sweet'
  | 'soak'
  | 'liberation'
  | 'thrust'
  | 'ground'
  | 'shroud'
  | 'creed'
  | 'chop'
  | 'smash'
  | 'warcry'
  | 'vortex'
  | 'katar'
  | 'sighted'
  | 'tornado'
  | 'whisper'
  | 'rend'
  | 'determined'
  | 'indomitable'
  | 'perish'
  | 'corrupt'
  | 'judge'
  | 'ruin'
  | 'advent'
  | 'present'
  | 'thrill'
  | 'dare'
  | 'die'
  | 'melody'
  | 'song'
  | 'passion'
  | 'vital'
  | 'coordination'
  | 'turbulent'
  | 'finisher'
  | 'unstayed'
  | 'counter'
  | 'crash'
  | 'thunder'
  | 'explosion'
  | 'break'
  | 'limit'
  | 'fury'
  | 'rapid'
  | 'smoke'
  | 'glue'
  | 'baam'
  | 'pirates'
  | 'roll'
  | 'lockon'
  | 'restrain'
  | 'assassinate'
  | 'laser'
  | 'barrage'
  | 'siege'
  | 'sieglaser'
  | 'focused'
  | 'unsiege'
  | 'tailwind'
  | 'wakeup'
  | 'cheer'
  | 'headwind'
  | 'caienne'
  | 'devion'
  | 'icarus'
  | 'purify'
  | 'circle'
  | 'origin'
  | 'uproar'
  | 'gluttony'
  | 'rampage'
  | 'ultrasonic'
  | 'crystal'
  | 'instrument'
  | 'path'
  | 'zone'
  | 'stigmata'
  | 'tempest'
  | 'oasis'
  | 'cataract'
  | 'sunsword'
  | 'sunbless'
  | 'sunjudge'
  | 'shoo'
  | 'bear'
  | 'alone'
  | 'scare'
  | 'desert'
  | 'spirit'
  | 'sandstorm'
  | 'rites'
  | 'mark'
  | 'ruinday'
  | 'hatred'
  | 'grudge'
  | 'dread'
  | 'salvation'
  | 'mercy'
  | 'atonement'
  | 'embrace'
  | 'quick'
  | 'wargod'
  | 'punch'
  | 'outta'
  | 'potential'
  | 'watah'
  | 'merciless'
  | 'curtain'
  | 'bladeclaw'
  | 'orb'
  | 'bloodzone'
  | 'banquet'
  | 'destruction'
  | 'protection'
  | 'divine'
  | 'petrify'
  | 'timecurse'
  | 'pain'
  | 'halt'
  | 'justice'
  | 'honor'
  | 'radiance'
  | 'splendor'
  | 'resonance'
  | 'dance'
  | 'bloom'
  | 'luberry'
  | 'redshot'
  | 'whirlwind'
  | 'transcend'
  | 'voidstrike'
  | 'untranscend'
  | 'voidattack';

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
  // Yanne.
  shot: { lands: [0.45], until: 1 },
  focus: { lands: [1.3], until: 1.9 },
  wipeout: { lands: [0.6], until: 1.3 },
  unleash: { lands: [0.6], until: 1.4 },
  // Neraxis (Black Lightning Claw's second blow a second after its first).
  maw: { lands: [0.42], until: 1 },
  lightning: { lands: [0.45, 1.45], until: 1.9 },
  roar: { lands: [0.6], until: 1.5 },
  breath: { lands: every(6, 0.6, 0.15), until: 1.9 },
  // Erze (Soaking Blood's blow and Blood Liberation's come after, of themselves).
  drain: { lands: [0.42], until: 1 },
  sweet: { lands: [0.5], until: 1.2 },
  soak: { lands: [0.6], until: 1.3 },
  liberation: { lands: [0.7], until: 1.4 },
  // Loman (Knight's Creed's last swing two blows).
  thrust: { lands: [0.45], until: 1.1 },
  ground: { lands: [0.6], until: 1.4 },
  shroud: { lands: [0.6], until: 1.4 },
  creed: { lands: [0.45, 0.8, 1.3, 1.45], until: 2 },
  // Gau.
  chop: { lands: [0.45], until: 1.1 },
  smash: { lands: [0.4, 0.75], until: 1.3 },
  warcry: { lands: [0.6], until: 1.5 },
  vortex: { lands: every(6, 0.4, 0.15), until: 1.6 },
  // Tanya (her attack a cut of each katar; Whisper of Death's last its blow more).
  katar: { lands: [0.3, 0.55], until: 1 },
  sighted: { lands: [0.5], until: 1.2 },
  tornado: { lands: [0.4, 0.6, 0.8], until: 1.3 },
  whisper: { lands: [...every(6, 0.4, 0.12), 1.3], until: 1.9 },
  // Rebel Klaus (Perish.'s last its blow on the ground).
  rend: { lands: [0.45], until: 1.1 },
  determined: { lands: [0.5], until: 1.2 },
  indomitable: { lands: [0.55], until: 1.4 },
  perish: { lands: [...every(6, 0.4, 0.12), 1.4], until: 2 },
  // Dark Lord Kasel (each skill's last blow its [Dark Lord] state's blow more: nothing without it).
  corrupt: { lands: [0.3, 0.6], until: 1.15 },
  judge: { lands: [0.4, 0.65, 1.1], until: 1.6 },
  ruin: { lands: [0.5, 0.7, 0.9, 1.35], until: 1.8 },
  advent: { lands: [0.8], until: 1.6 },
  // Pansirone (King's Raid's own timings: its animations').
  present: { lands: [1.7], until: 3 },
  thrill: { lands: [1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8], until: 5.1 },
  dare: { lands: [1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4], until: 4.9 },
  die: { lands: [2.3, 2.6, 2.9, 3.2, 3.5, 3.8, 4.1], until: 5.2 },
  // Shea (King's Raid's own timings: its animations').
  melody: { lands: [1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.7, 8.1, 9.1], until: 9.2 },
  song: { lands: [1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.8], until: 10.6 },
  passion: { lands: [1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.7], until: 10.6 },
  // Priscilla (King's Raid's own timings: its animations').
  vital: { lands: [1.7], until: 3.1 },
  coordination: { lands: [0.9, 1], until: 1.8 },
  turbulent: { lands: [2.1], until: 3.5 },
  // Glenwys (King's Raid's own timings: its animations').
  finisher: { lands: [1.4, 1.7, 2, 2.3, 2.6, 2.9, 3.2], until: 4.1 },
  unstayed: { lands: [0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9], until: 2.8 },
  counter: { lands: [1.5], until: 3.1 },
  // Theo (King's Raid's own timings: its animations').
  crash: { lands: [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.3, 3.5], until: 3.6 },
  thunder: { lands: [1.6], until: 2.3 },
  explosion: { lands: [1.9, 2, 2.1, 2.3, 2.4], until: 2.9 },
  // Chase (King's Raid's own timings: its animations').
  break: { lands: [1.5], until: 2.5 },
  limit: { lands: [1.2], until: 2.5 },
  fury: { lands: [0.3, 1.8, 2.6, 2.8, 3], until: 4 },
  // Lakrak (King's Raid's own timings: its animations').
  rapid: { lands: [1.8], until: 2.77 },
  smoke: { lands: [1.2], until: 2 },
  glue: { lands: [1.3], until: 2 },
  // Miruru (King's Raid's own timings: its animations').
  baam: { lands: [1.6], until: 3 },
  pirates: { lands: [1.6, 1.9, 2.2, 2.5, 2.8], until: 2.9 },
  roll: { lands: [0.6, 1.2, 1.8], until: 1.9 },
  // Mirianne (King's Raid's own timings: its animations').
  lockon: { lands: [1.4, 1.7, 2], until: 2.8 },
  restrain: { lands: [1.1], until: 3 },
  assassinate: { lands: [2, 2.1], until: 3.7 },
  // Kara (King's Raid's own timings: its animations').
  laser: { lands: [1.1, 1.3, 1.5, 1.7, 2.1], until: 3.8 },
  barrage: { lands: [2.3, 2.7, 3.1, 3.5], until: 4.4 },
  // (Release Siege Weapon: only her turning into the Siege Weapon; and her two skills as one, and turning back.)
  siege: { lands: [], until: 1.1 },
  sieglaser: { lands: [1.8], until: 3.1 },
  focused: { lands: [2, 2.1, 2.2, 2.3, 2.4], until: 3.8 },
  unsiege: { lands: [], until: 1.5 },
  // Estelle (King's Raid's own timings: its animations').
  tailwind: { lands: [1.6, 4.3], until: 5.4 },
  wakeup: { lands: [0.4, 1.1], until: 2.3 },
  cheer: { lands: [2.5], until: 4.5 },
  headwind: { lands: [1.8], until: 2.9 },
  // Isolet (King's Raid's own timings: its animations').
  caienne: { lands: [1.8], until: 2.7 },
  devion: { lands: [1.8, 2.2, 2.6, 3, 3.4], until: 4.4 },
  icarus: { lands: [1.9], until: 4.1 },
  // Evan (King's Raid's own timings: its animations').
  purify: { lands: [2.3], until: 3.5 },
  circle: { lands: [2.8], until: 4.1 },
  origin: { lands: [1.9], until: 4.6 },
  uproar: { lands: [2], until: 3.3 },
  gluttony: { lands: [1.9], until: 3.4 },
  rampage: { lands: [2.5, 3, 3.4, 3.9, 4.2, 4.7, 5.6], until: 5.8 },
  // Rehartna (King's Raid's own timings: its animations').
  ultrasonic: { lands: [2.3, 2.5, 2.7, 2.9], until: 4 },
  crystal: { lands: [0.7], until: 1.9 },
  instrument: { lands: [2.3], until: 4 },
  // Lucias (King's Raid's own timings: its animations').
  path: { lands: [1.1], until: 2.3 },
  zone: { lands: [1.3], until: 2.5 },
  stigmata: { lands: [2.1], until: 3.3 },
  // Lilia (King's Raid's own timings: its animations').
  tempest: { lands: [1], until: 2.1 },
  oasis: { lands: [1.6], until: 2.6 },
  cataract: { lands: [0, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.3, 4.6, 4.9, 5.2, 5.5], until: 6.6 },
  // Aselica (King's Raid's own timings: its animations').
  sunsword: { lands: [1.6], until: 2.2 },
  sunbless: { lands: [0, 1.1], until: 2.5 },
  sunjudge: { lands: [0.4, 0.9, 1.4, 1.9, 2.4, 2.9, 3.4, 3.9, 4.9], until: 6.1 },
  // Lavril (King's Raid's own timings: its animations').
  shoo: { lands: [1], until: 2.1 },
  bear: { lands: [1.9], until: 4 },
  alone: { lands: [2.7], until: 5 },
  scare: { lands: [1.9], until: 4 },
  // Zafir (King's Raid's own timings: its animations').
  desert: { lands: [1.5], until: 2.5 },
  spirit: { lands: [1.3], until: 2.5 },
  sandstorm: { lands: [1.9], until: 3.5 },
  // Jane (King's Raid's own timings: its animations').
  rites: { lands: [1.9], until: 4.5 },
  mark: { lands: [0, 1.8, 2], until: 3.5 },
  ruinday: { lands: [2.6], until: 5 },
  // Shakmeh (King's Raid's own timings: its animations').
  hatred: { lands: [1.3, 1.5, 1.7, 1.9, 2.1], until: 3.4 },
  grudge: { lands: [2], until: 3 },
  dread: { lands: [2.7], until: 3.8 },
  // Isaiah (King's Raid's own timings: its animations').
  salvation: { lands: [1.8], until: 3.6 },
  mercy: { lands: [0.6, 1.3], until: 2.7 },
  atonement: { lands: [0, 1.8, 2.5], until: 3.9 },
  embrace: { lands: [0.6, 2.2], until: 2.6 },
  // Gladi (King's Raid's own timings: its animations').
  quick: { lands: [1.2, 1.4, 1.6, 1.7, 1.8, 1.9, 2.2], until: 2.9 },
  wargod: { lands: [1], until: 1.6 },
  punch: { lands: [2], until: 2.8 },
  // Cecilia (King's Raid's own timings: its animations').
  outta: { lands: [0.7, 1.3, 2.3, 2.901, 3.2], until: 4.2 },
  potential: { lands: [1.9], until: 2.9 },
  watah: { lands: [0.7, 1, 1.3, 1.6, 1.9, 2.2, 3.3, 5.9], until: 7.5 },
  // Roi (King's Raid's own timings: its animations').
  merciless: { lands: [0.8, 1.1, 1.2, 1.433, 1.533, 1.767, 2.367], until: 2.9 },
  curtain: { lands: [0.5, 1, 1.1, 1.2, 1.3, 1.5, 1.9], until: 2.33 },
  bladeclaw: { lands: [0.967], until: 1.63 },
  // Lewisia (King's Raid's own timings: its animations').
  orb: { lands: [2.1], until: 3.2 },
  bloodzone: { lands: [2], until: 3 },
  banquet: { lands: [3, 3.2, 3.4], until: 4.6 },
  // Ricardo (King's Raid's own timings: its animations').
  destruction: { lands: [1.8], until: 3.1 },
  protection: { lands: [1.4], until: 2.6 },
  divine: { lands: [1, 1.7, 3], until: 4.3 },
  // Shamilla (King's Raid's own timings: its animations').
  petrify: { lands: [1.6], until: 2.4 },
  timecurse: { lands: [1.7], until: 2.7 },
  pain: { lands: [2.4], until: 4.1 },
  // Scarlet (King's Raid's own timings: its animations').
  halt: { lands: [1.7], until: 2.8 },
  justice: { lands: [1.3], until: 2.6 },
  honor: { lands: [0.4, 0.7, 2.6, 2.9], until: 3.4 },
  // Talisha (King's Raid's own timings: its animations').
  radiance: { lands: [2.8], until: 3.9 },
  splendor: { lands: [3.5], until: 5.2 },
  resonance: { lands: [1.7], until: 2.8 },
  dance: { lands: [2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1, 3.2, 3.3], until: 3.9 },
  bloom: { lands: [3.5], until: 5.2 },
  luberry: { lands: [1.7], until: 2.8 },
  redshot: { lands: [0.5, 0.6, 0.7, 1.3, 1.4, 1.5], until: 2.4 },
  // Hilda (King's Raid's own timings: its animations').
  whirlwind: { lands: [2.3, 2.6, 2.9, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5, 5.3, 5.6], until: 6.8 },
  transcend: { lands: [1.6], until: 3.4 },
  voidstrike: { lands: [2.3], until: 4.1 },
  untranscend: { lands: [], until: 1.1 },
  voidattack: { lands: [0.3, 0.9, 2, 2.6, 3.4, 3.9, 4.5, 5, 6], until: 7 },
};
