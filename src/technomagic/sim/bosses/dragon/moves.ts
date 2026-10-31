import type { BossMove, Plan } from '../boss';
import { KR_ATK } from './common';

/*
 * The dragons' moves, as the fight has them: King's Raid's four dragons (Temeraire, Scalaxia, Zyrrkinoth, Armarta) are one
 * body on one skeleton, so they move alike, each of their skills some of these one after another. There is one part to a
 * dragon (`D`): its moves never overlap. What comes of each as it lands is each dragon's (../<dragon>/skills.ts); how its
 * body moves for each is the page's (../../../bosses/dragon/tracks.ts, drawn to fit these).
 */

export type DragonMove = 'bite' | 'claw' | 'sweep' | 'smash' | 'inhale' | 'breath' | 'roar' | 'rise' | 'storm' | 'land' | 'gaze' | PoisonMove;

/** Zyrrkinoth's own moves: its Poison Cloud's and its Poisoned Lands' (the playtest's 441330, and 441340 to 441343). */
type PoisonMove = 'call' | 'spit' | 'linger' | 'soar' | 'aloft' | 'hover' | 'pour' | 'hang' | 'slam';

/** Its one part: all its moves are its body's. */
export const BODY = 'D';

/** What a blow takes, as a share of a dragon's ATK at stage 1 (King's Raid's playtest's: its skill's damage share). */
const share = (of: number): readonly [number, number] => [of * (KR_ATK[0] as number), of * (KR_ATK[0] as number)];

/**
 * How long each of its moves takes, when its blow lands, and what that takes of whoever it lands on, before their defense: as
 * the playtest's dragons' skills have it, of their ATK (a dragon's attack 250%; its quick skill 120%; Tail Strike 100%; a
 * tail smash 40%, a blow of its breath 30%, of its storm 25%; its landing 200%. Its share of a hero's health that some add
 * is not here).
 */
export const MOVES: Readonly<Record<DragonMove, BossMove>> = {
  // Its jaws, at whoever it is going for.
  bite: { length: 1.7, hit: 0.8, hurts: share(2.5) },
  // A swipe of a foreclaw, at whoever it is going for.
  claw: { length: 1.6, hit: 0.75, hurts: share(1.2) },
  // Its tail swept across the whole field.
  sweep: { length: 2.1, hit: 1, hurts: share(1) },
  // Its tail brought down on the heroes (three in a row, as Scalaxia's and Zyrrkinoth's are).
  smash: { length: 1.1, hit: 0.55, hurts: share(0.4) },
  // Breathing in, before its breath (nothing lands: a CC gauge broken now stops the breath).
  inhale: { length: 1.4, hit: null },
  // Its breath over the field, a blow at a time.
  breath: { length: 0.55, hit: 0.25, hurts: share(0.3) },
  // A roar that shakes the field (a little: what it calls up is the rest).
  roar: { length: 2.1, hit: 0.6, hurts: share(0.25) },
  // Up into the air on its wings (nothing lands), and what it casts from there, and down again with all its weight.
  rise: { length: 1.4, hit: null },
  storm: { length: 1, hit: 0.45, hurts: share(0.25) },
  land: { length: 1.3, hit: 0.85, hurts: share(2) },
  // Its eyes on one hero (Armarta's Stone Gaze).
  gaze: { length: 1.8, hit: 1.1 },
  // Zyrrkinoth's Poison Cloud (6 seconds): its Slimes called up 0.5 seconds in, then two blows of 150% on one hero, at 3 and 3.2.
  call: { length: 3, hit: 0.5 },
  spit: { length: 0.2, hit: 0, hurts: share(1.5) },
  linger: { length: 2.6, hit: null },
  // Zyrrkinoth's Poisoned Lands (9.8 seconds): up on its wings, their blast 1.6 seconds in (no ATK of its own: a share of each
  // hero's health); 1 second unseen in the air (its debuffs gone); five blows of 250% over the field, 0.3 to 0.7 seconds into
  // the next; and down again, its landing 1.3 seconds into its last 2.5 (a share of each hero's health again).
  soar: { length: 5.3, hit: 1.6 },
  aloft: { length: 1, hit: 0 },
  hover: { length: 0.3, hit: null },
  pour: { length: 0.1, hit: 0, hurts: share(2.5) },
  hang: { length: 0.2, hit: null },
  slam: { length: 2.5, hit: 1.3 },
};

/** Its moves in each of its attacks, by the attack's name: each after the last is done. */
export const PLANS: Readonly<Record<string, Plan>> = {
  bite: [['bite', BODY, 0]],
  claw: [['claw', BODY, 0]],
  sweep: [['sweep', BODY, 0]],
  smashes: [
    ['smash', BODY, 0],
    ['smash', BODY, 0],
    ['smash', BODY, 0],
  ],
  breath: [
    ['inhale', BODY, 0],
    ['breath', BODY, 0],
    ['breath', BODY, 0],
    ['breath', BODY, 0],
    ['breath', BODY, 0],
  ],
  roar: [['roar', BODY, 0]],
  storm: [
    ['rise', BODY, 0],
    ['storm', BODY, 0],
    ['storm', BODY, 0],
    ['land', BODY, 0],
  ],
  eclipse: [
    ['rise', BODY, 0],
    ['land', BODY, 0],
  ],
  gaze: [['gaze', BODY, 0]],
  cloud: [
    ['call', BODY, 0],
    ['spit', BODY, 0],
    ['spit', BODY, 0],
    ['linger', BODY, 0],
  ],
  lands: [['soar', BODY, 0], ['aloft', BODY, 0], ['hover', BODY, 0], ...Array.from({ length: 5 }, () => ['pour', BODY, 0] as const), ['hang', BODY, 0], ['slam', BODY, 0]],
};

/** How many of a breath's moves come before its first blow (the breathing in). */
export const INHALE = 1;
