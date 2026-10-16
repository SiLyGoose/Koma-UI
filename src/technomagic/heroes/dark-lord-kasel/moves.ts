import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LOW, LUNGE, TALL, TUCKED, WIDE } from '../moves/stances';

/*
 * What Dark Lord Kasel's body does for his attack and his three skills: a swordsman's, Aea in his right hand. They are
 * written from how he stands (STAND). What comes of each is in ../../sim/heroes/dark-lord-kasel.ts.
 */

/** How he stands: on guard, Aea's hilt in his right hand out before him, its point toward the boss and raised 30°; his left hand loose at his side. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.06,
  hipTurn: -0.12,
  lean: 0.08,
  tilt: 0.02,
  lfX: 0.06,
  lfZ: 0.14,
  rfX: -0.06,
  rfZ: -0.1,
  lhX: 0.22,
  lhY: 0.05,
  lhZ: 0.05,
  rhX: -0.2,
  rhY: 0.2,
  rhZ: 0.3,
  bTurn: 0,
  bUp: Math.PI / 6,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Drawn back low at his right; swept across to his left; raised high over his head; brought down before him. */
const DRAWN = { rhX: -0.42, rhY: 0.22, rhZ: -0.12, bTurn: 4.4, bUp: 0.2 };
const SWEPT = { rhX: 0.3, rhY: 0.22, rhZ: 0.36, bTurn: 7.2, bUp: 0 };
const RAISED = { lhX: 0.05, lhY: 0.6, lhZ: 0, rhX: -0.12, rhY: 0.64, rhZ: -0.05, bTurn: 0, bUp: 2.4 };
const DOWN = { lhX: 0.02, lhY: 0.18, lhZ: 0.45, rhX: -0.08, rhY: 0.15, rhZ: 0.5, bTurn: 0, bUp: -0.5 };

// His attack: Aea swung across from his right to his left, and back.
export const CORRUPT: Move = {
  keys: [
    [0, {}],
    [0.18, as({ ...LOW, twist: -0.55, lean: 0.06, ...DRAWN })],
    [0.3, as({ ...LOW, hipZ: 0.08, twist: 0.5, lean: 0.2, ...SWEPT })],
    [0.44, as({ ...LOW, hipZ: 0.06, twist: 0.6, lean: 0.16, ...SWEPT, bTurn: 7.8 })],
    [0.6, as({ ...LOW, hipZ: 0.08, twist: -0.5, lean: 0.2, ...DRAWN, rhZ: 0.32, bTurn: 5.3 })],
    [0.74, as({ ...LOW, hipZ: 0.06, twist: -0.6, lean: 0.14, ...DRAWN, bTurn: 4.8 })],
    [1.15, {}],
  ],
};

// Judgment Blade: a lunge and two cuts along it, one way then the other; then Aea raised and brought down, and back.
export const JUDGE: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, twist: -0.5, ...DRAWN })],
    [0.4, as({ ...LUNGE, ahead: 1.2, twist: 0.55, lean: 0.3, ...SWEPT })],
    [0.65, as({ ...LUNGE, ahead: 1.4, twist: -0.5, lean: 0.28, ...DRAWN, rhZ: 0.3 })],
    [0.9, as({ ...COILED, ahead: 1.4, lean: -0.1, ...RAISED })],
    [1.1, as({ ...LUNGE, ahead: 1.6, lean: 0.38, ...DOWN })],
    [1.6, {}],
  ],
};

// Doom: Aea thrust out three times, the darkness bursting before him; then a fourth, and back.
export const RUIN: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, twist: 0.3, ...DRAWN, rhZ: -0.2 })],
    [0.5, as({ ...LUNGE, ahead: 1, lean: 0.3, rhX: -0.12, rhY: 0.3, rhZ: 0.55, bTurn: 0, bUp: 0 })],
    [0.6, as({ ...LUNGE, ahead: 1, lean: 0.24, rhX: -0.2, rhY: 0.3, rhZ: 0.2, bTurn: 0, bUp: 0 })],
    [0.7, as({ ...LUNGE, ahead: 1.1, lean: 0.3, rhX: -0.12, rhY: 0.3, rhZ: 0.55, bTurn: 0, bUp: 0 })],
    [0.8, as({ ...LUNGE, ahead: 1.1, lean: 0.24, rhX: -0.2, rhY: 0.3, rhZ: 0.2, bTurn: 0, bUp: 0 })],
    [0.9, as({ ...LUNGE, ahead: 1.2, lean: 0.32, rhX: -0.12, rhY: 0.3, rhZ: 0.56, bTurn: 0, bUp: 0 })],
    [1.15, as({ ...WIDE, ahead: 1.2, lean: 0.05, ...DRAWN })],
    [1.35, as({ ...WIDE, ahead: 1.3, lean: 0.3, ...SWEPT })],
    [1.8, {}],
  ],
};

// Advent of the Dark Lord: drawn up tall, Aea raised high as the darkness takes him; a leap, and down on one knee with it driven into the ground, and back.
export const ADVENT: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...TALL, lean: -0.2, nod: -0.35, ...RAISED })],
    [0.6, as({ ...TUCKED, jump: 1.2, lean: -0.1, ...RAISED })],
    [0.8, as({ ...KNEELING, lean: 0.48, ...DOWN, bUp: -1.1 })],
    [1.1, as({ ...KNEELING, hipY: -0.44, lean: 0.44, ...DOWN, bUp: -1.1 })],
    [1.6, {}],
  ],
};
