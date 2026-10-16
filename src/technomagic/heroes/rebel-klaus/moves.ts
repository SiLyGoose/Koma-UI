import { at, REST, TURN, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LOW, LUNGE, TALL, TUCKED, WIDE } from '../moves/stances';

/*
 * What Rebel Klaus's body does for his attack and his three skills: a shieldless knight's, Galicta in his right hand.
 * They are written from how he stands (STAND). What comes of each is in ../../sim/heroes/rebel-klaus.ts.
 */

/** How he stands: on guard, Galicta's hilt in his right hand out before him, its point toward the boss and raised 30°; his left hand empty. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.06,
  hipTurn: -0.1,
  lean: 0.08,
  tilt: 0.02,
  lfX: 0.06,
  lfZ: 0.14,
  rfX: -0.06,
  rfZ: -0.1,
  lhX: 0.2,
  lhY: 0.04,
  lhZ: 0.06,
  rhX: -0.2,
  rhY: 0.2,
  rhZ: 0.3,
  bTurn: 0,
  bUp: Math.PI / 6,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Galicta raised high over his head, both hands on it; brought down before him. */
const RAISED = { lhX: 0.05, lhY: 0.62, lhZ: 0, rhX: -0.12, rhY: 0.64, rhZ: -0.05, bTurn: 0, bUp: 2.4 };
const DOWN = { lhX: 0.02, lhY: 0.18, lhZ: 0.45, rhX: -0.08, rhY: 0.15, rhZ: 0.5, bTurn: 0, bUp: -0.5 };
/**
 * Drawn back low at his right; swept across to his left. (Galicta's turns are a whole turn less than a knight's, as he
 * holds it straight ahead: so it comes back to how he stands the short way, not round all of him.)
 */
const DRAWN = { lhX: -0.05, lhY: 0.2, lhZ: 0.1, rhX: -0.42, rhY: 0.22, rhZ: -0.12, bTurn: 4.4 - TURN, bUp: 0.2 };
const SWEPT = { lhX: 0.25, lhY: 0.25, lhZ: 0.25, rhX: 0.3, rhY: 0.22, rhZ: 0.36, bTurn: 7.2 - TURN, bUp: 0 };

// His attack: Galicta raised and brought down on the boss, and back.
export const REND: Move = {
  keys: [
    [0, {}],
    [0.28, as({ ...COILED, lean: -0.05, ...RAISED })],
    [0.45, as({ ...LUNGE, ahead: 0.6, lean: 0.35, ...DOWN })],
    [0.65, as({ ...LUNGE, ahead: 0.6, hipY: -0.3, lean: 0.32, ...DOWN })],
    [1.1, {}],
  ],
};

// Determined Strike: a step in and a great cut across the boss, from his right to his left, held, and back.
export const DETERMINED: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, twist: -0.5, lean: 0.05, ...DRAWN })],
    [0.5, as({ ...LUNGE, ahead: 1.4, twist: 0.55, lean: 0.3, ...SWEPT })],
    [0.75, as({ ...LUNGE, ahead: 1.4, hipY: -0.3, twist: 0.6, lean: 0.26, ...SWEPT })],
    [1.2, {}],
  ],
};

// Indomitable Will: drawn up tall, Galicta raised high and its point driven down into the ground before him, and back.
export const INDOMITABLE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...TALL, lean: -0.15, nod: -0.3, ...RAISED })],
    [0.55, as({ ...WIDE, lean: 0.3, ...DOWN, bUp: -1.2 })],
    [0.95, as({ ...WIDE, hipY: -0.34, lean: 0.28, ...DOWN, bUp: -1.2 })],
    [1.4, {}],
  ],
};

/** One cut of Perish.'s barrage: across, one way or the other. */
const cut = (left: boolean): Partial<Pose> => as({ ...LOW, ahead: 1.2, twist: left ? 0.5 : -0.5, lean: 0.24, ...(left ? SWEPT : DRAWN) });

// Perish.: a dash in and six cuts, one way then the other; then a leap, and Galicta brought down on the ground, and back.
export const PERISH: Move = {
  keys: [
    [0, {}],
    [0.3, cut(false)],
    [0.4, cut(true)],
    [0.52, cut(false)],
    [0.64, cut(true)],
    [0.76, cut(false)],
    [0.88, cut(true)],
    [1, cut(false)],
    [1.18, as({ ...TUCKED, ahead: 1.6, jump: 1.6, lean: -0.15, ...RAISED })],
    [1.4, as({ ...KNEELING, ahead: 2, lean: 0.5, ...DOWN, bUp: -0.9 })],
    [1.6, as({ ...KNEELING, ahead: 2, hipY: -0.44, lean: 0.46, ...DOWN, bUp: -0.9 })],
    [2, {}],
  ],
};
