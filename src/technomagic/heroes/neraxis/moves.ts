import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LUNGE, TALL, WIDE } from '../moves/stances';

/*
 * What Neraxis's body does for his attack and his three skills: the black dragon in a knight's shape, his dragon's
 * gauntlet on his left hand and his wings at his back. They are written from how he stands (STAND). What comes of each
 * is in ../../sim/heroes/neraxis.ts.
 */

/** How he stands: tall and square, his clawed left hand held before him, his right at his side. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.02,
  hipTurn: -0.08,
  lean: 0.04,
  tilt: 0.02,
  lfX: 0.07,
  lfZ: 0.1,
  rfX: -0.05,
  rfZ: -0.07,
  lhX: 0.15,
  lhY: 0.16,
  lhZ: 0.22,
  rhX: -0.22,
  rhY: -0.04,
  rhZ: 0,
  bTurn: 0,
  bUp: -1.2,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His claw drawn back by his shoulder; and raked out at the boss. */
const DRAWN = { hipTurn: 0.25, twist: 0.3, lhX: 0.22, lhY: 0.36, lhZ: -0.05 };
const RAKED = { hipTurn: -0.2, twist: -0.3, lhX: -0.02, lhY: 0.26, lhZ: 0.56 };

// His attack: his claw drawn back and raked across the boss, and back.
export const MAW: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, ...DRAWN })],
    [0.42, as({ ...LUNGE, ahead: 0.5, lean: 0.25, ...RAKED })],
    [0.6, as({ ...LUNGE, ahead: 0.5, lean: 0.22, ...RAKED })],
    [1, {}],
  ],
};

// Black Lightning Claw: a dash and a rake (lightning drawn down on the boss), then his claw raised as it strikes again.
export const LIGHTNING: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, ...DRAWN })],
    [0.45, as({ ...LUNGE, ahead: 1.4, lean: 0.35, ...RAKED })],
    [0.9, as({ ...LUNGE, ahead: 1.2, lean: 0.2, ...RAKED })],
    [1.3, as({ ...TALL, ahead: 0.6, lean: -0.1, lhX: 0.1, lhY: 0.7, lhZ: 0.2 })],
    [1.5, as({ ...WIDE, ahead: 0.4, lean: 0.15, lhX: 0.05, lhY: 0.2, lhZ: 0.5 })],
    [1.9, {}],
  ],
};

// Obsidian Roar: his head thrown back and his arms flung wide as he roars, then down into a wide stance, and back.
export const ROAR: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...TALL, lean: -0.22, nod: -0.4, lhX: 0.45, lhY: 0.38, lhZ: 0.1, rhX: -0.45, rhY: 0.38, rhZ: 0.1 })],
    [0.6, as({ ...WIDE, lean: 0.15, nod: 0.1, lhX: 0.4, lhY: 0.12, lhZ: 0.2, rhX: -0.4, rhY: 0.12, rhZ: 0.2 })],
    [1.05, as({ ...WIDE, lean: 0.12, lhX: 0.4, lhY: 0.12, lhZ: 0.2, rhX: -0.4, rhY: 0.12, rhZ: 0.2 })],
    [1.5, {}],
  ],
};

// Breath of Destruction: reared back, then leaning in, both hands out before him, as the breath pours over the boss.
export const BREATH: Move = {
  keys: [
    [0, {}],
    [0.4, as({ ...COILED, lean: -0.2, nod: -0.3, lhX: 0.2, lhY: 0.5, lhZ: 0.05, rhX: -0.2, rhY: 0.5, rhZ: 0.05 })],
    [0.6, as({ ...LUNGE, lean: 0.35, nod: 0.15, lhX: 0.08, lhY: 0.32, lhZ: 0.55, rhX: -0.08, rhY: 0.32, rhZ: 0.55 })],
    [1.45, as({ ...LUNGE, lean: 0.38, nod: 0.15, lhX: 0.08, lhY: 0.3, lhZ: 0.56, rhX: -0.08, rhY: 0.3, rhZ: 0.56 })],
    [1.9, {}],
  ],
};
