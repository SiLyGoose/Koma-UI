import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LUNGE, TALL, WIDE } from '../moves/stances';

/*
 * What Loman's body does for his attack and his three skills: a knight's, his halberd in his right hand. They are
 * written from how he stands (STAND). What comes of each is in ../../sim/heroes/loman.ts.
 */

/** How he stands: upright, his halberd planted upright at his right side, his left hand at his belt. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.02,
  hipTurn: -0.08,
  lean: 0.02,
  tilt: 0.02,
  lfX: 0.06,
  lfZ: 0.08,
  rfX: -0.05,
  rfZ: -0.05,
  lhX: 0.18,
  lhY: 0.02,
  lhZ: 0.06,
  rhX: -0.25,
  rhY: 0.12,
  rhZ: 0.1,
  bTurn: 0,
  bUp: 1.5,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His halberd levelled at the boss, both hands on it; thrust out; raised high over his head. */
const LEVELLED = { hipTurn: 0.3, twist: 0.25, lhX: 0, lhY: 0.25, lhZ: 0.3, rhX: -0.18, rhY: 0.24, rhZ: -0.05, bTurn: 0, bUp: 0 };
const THRUST_OUT = { ...LEVELLED, lhZ: 0.55, rhZ: 0.25 };
const RAISED = { lhX: 0.05, lhY: 0.6, lhZ: 0.1, rhX: -0.15, rhY: 0.62, rhZ: 0, bTurn: 0, bUp: 2.3 };
/** Brought down before him, its head at the boss's feet. */
const DOWN = { lhX: 0.02, lhY: 0.15, lhZ: 0.45, rhX: -0.1, rhY: 0.2, rhZ: 0.3, bTurn: 0, bUp: -0.4 };

// His attack: his halberd levelled and thrust into the boss, and back.
export const THRUST: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, ...LEVELLED })],
    [0.45, as({ ...LUNGE, ahead: 0.6, lean: 0.25, ...THRUST_OUT })],
    [0.65, as({ ...LUNGE, ahead: 0.6, lean: 0.22, ...THRUST_OUT })],
    [1.1, {}],
  ],
};

// Cut Ground: raised high and brought down on the ground before the boss, and back.
export const GROUND: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: -0.1, ...RAISED })],
    [0.6, as({ ...LUNGE, ahead: 0.8, lean: 0.35, ...DOWN })],
    [0.9, as({ ...LUNGE, ahead: 0.8, hipY: -0.32, lean: 0.32, ...DOWN })],
    [1.4, {}],
  ],
};

// Shrouding Creed: his halberd raised upright overhead as the light spreads over his allies, and back.
export const SHROUD: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...TALL, lean: -0.1, nod: -0.2, lhX: 0.3, lhY: 0.3, lhZ: 0.1, rhX: -0.12, rhY: 0.66, rhZ: 0.05, bTurn: 0, bUp: 1.55 })],
    [0.6, as({ ...TALL, lean: -0.12, nod: -0.25, lhX: 0.35, lhY: 0.35, lhZ: 0.1, rhX: -0.12, rhY: 0.7, rhZ: 0.05, bTurn: 0, bUp: 1.55 })],
    [0.95, as({ ...WIDE, lean: 0.05, rhX: -0.2, rhY: 0.2, rhZ: 0.2, bUp: 1.5 })],
    [1.4, {}],
  ],
};

// Knight's Creed: two thrusts, then raised high and swept down in a wide last swing, and back.
export const CREED: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, ...LEVELLED })],
    [0.45, as({ ...LUNGE, ahead: 0.7, lean: 0.25, ...THRUST_OUT })],
    [0.62, as({ ...COILED, ahead: 0.6, ...LEVELLED })],
    [0.8, as({ ...LUNGE, ahead: 0.9, lean: 0.28, ...THRUST_OUT })],
    [1.1, as({ ...COILED, ahead: 0.8, lean: -0.1, ...RAISED })],
    [1.3, as({ ...WIDE, ahead: 1, lean: 0.35, ...DOWN, hipTurn: -0.35, twist: -0.3 })],
    [1.5, as({ ...WIDE, ahead: 1, lean: 0.32, ...DOWN, hipTurn: 0.3, twist: 0.3 })],
    [2, {}],
  ],
};
