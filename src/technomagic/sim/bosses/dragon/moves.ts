import type { BossMove, Plan } from '../boss';

/*
 * The dragons' moves, as the fight has them: King's Raid's four dragons (Temeraire, Scalaxia, Zyrrkinoth, Armarta) are one
 * body on one skeleton, so they move alike, each of their skills some of these one after another. There is one part to a
 * dragon (`D`): its moves never overlap. What comes of each as it lands is each dragon's (../<dragon>/skills.ts); how its
 * body moves for each is the page's (../../../bosses/dragon/tracks.ts, drawn to fit these).
 */

export type DragonMove = 'bite' | 'claw' | 'sweep' | 'smash' | 'inhale' | 'breath' | 'roar' | 'rise' | 'storm' | 'land' | 'gaze';

/** Its one part: all its moves are its body's. */
export const BODY = 'D';

/** How long each of its moves takes, when its blow lands, and what that takes of whoever it lands on, least to most, before their defense. */
export const MOVES: Readonly<Record<DragonMove, BossMove>> = {
  // Its jaws, at whoever it is going for.
  bite: { length: 1.7, hit: 0.8, hurts: [280_000, 400_000] },
  // A swipe of a foreclaw, at whoever it is going for.
  claw: { length: 1.6, hit: 0.75, hurts: [240_000, 340_000] },
  // Its tail swept across the whole field.
  sweep: { length: 2.1, hit: 1, hurts: [160_000, 230_000] },
  // Its tail brought down on the heroes (three in a row, as Scalaxia's and Zyrrkinoth's are).
  smash: { length: 1.1, hit: 0.55, hurts: [110_000, 160_000] },
  // Breathing in, before its breath (nothing lands: a CC gauge broken now stops the breath).
  inhale: { length: 1.4, hit: null },
  // Its breath over the field, a blow at a time.
  breath: { length: 0.55, hit: 0.25, hurts: [120_000, 170_000] },
  // A roar that shakes the field (a little: what it calls up is the rest).
  roar: { length: 2.1, hit: 0.6, hurts: [60_000, 90_000] },
  // Up into the air on its wings (nothing lands), and what it casts from there, and down again with all its weight.
  rise: { length: 1.4, hit: null },
  storm: { length: 1, hit: 0.45, hurts: [200_000, 280_000] },
  land: { length: 1.3, hit: 0.85, hurts: [300_000, 420_000] },
  // Its eyes on one hero (Armarta's Stone Gaze).
  gaze: { length: 1.8, hit: 1.1 },
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
};

/** How many of a breath's moves come before its first blow (the breathing in). */
export const INHALE = 1;
