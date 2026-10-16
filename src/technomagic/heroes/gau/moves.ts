import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LUNGE, TALL, WIDE } from '../moves/stances';

/*
 * What Gau's body does for his attack and his three skills: a beastman warrior's, his great axe in his right hand. They
 * are written from how he stands (STAND). What comes of each is in ../../sim/heroes/gau.ts.
 */

/** How he stands: hunched and broad, his axe over his right shoulder. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.05,
  hipTurn: -0.08,
  lean: 0.1,
  tilt: 0.02,
  lfX: 0.08,
  lfZ: 0.1,
  rfX: -0.07,
  rfZ: -0.08,
  lhX: 0.2,
  lhY: 0.05,
  lhZ: 0.15,
  rhX: -0.28,
  rhY: 0.3,
  rhZ: 0.02,
  bTurn: 3.4,
  bUp: 0.9,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His axe raised high over his head; brought down before him. */
const RAISED = { lhX: 0.08, lhY: 0.6, lhZ: 0, rhX: -0.18, rhY: 0.62, rhZ: -0.05, bTurn: 0, bUp: 2.4 };
const DOWN = { lhX: 0.04, lhY: 0.15, lhZ: 0.45, rhX: -0.08, rhY: 0.12, rhZ: 0.5, bTurn: 0, bUp: -0.5 };
/** Swung round at his side, level. */
const SWUNG = { lhX: 0.3, lhY: 0.25, lhZ: 0.3, rhX: -0.35, rhY: 0.25, rhZ: 0.3, bTurn: 1.6, bUp: 0 };

// His attack: his axe raised and brought down on the boss, and back.
export const CHOP: Move = {
  keys: [
    [0, {}],
    [0.28, as({ ...COILED, lean: -0.05, ...RAISED })],
    [0.45, as({ ...LUNGE, ahead: 0.6, lean: 0.35, ...DOWN })],
    [0.65, as({ ...LUNGE, ahead: 0.6, hipY: -0.3, lean: 0.32, ...DOWN })],
    [1.1, {}],
  ],
};

// Smash: brought down hard (the boss knocked down), then swung up again, and back.
export const SMASH: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: -0.08, ...RAISED })],
    [0.4, as({ ...LUNGE, ahead: 0.9, lean: 0.4, ...DOWN })],
    [0.6, as({ ...LUNGE, ahead: 0.9, lean: 0.25, ...SWUNG })],
    [0.75, as({ ...LUNGE, ahead: 1, lean: 0.3, ...SWUNG, bTurn: -1.4 })],
    [1.3, {}],
  ],
};

// Battle Roar: his head thrown back and his arms flung wide as he roars, and back.
export const WARCRY: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...TALL, lean: -0.25, nod: -0.45, lhX: 0.45, lhY: 0.4, lhZ: 0.1, rhX: -0.45, rhY: 0.45, rhZ: 0.05, bTurn: 0, bUp: 2.2 })],
    [0.6, as({ ...WIDE, lean: 0.18, nod: 0.05, lhX: 0.42, lhY: 0.15, lhZ: 0.2, rhX: -0.42, rhY: 0.2, rhZ: 0.2, bTurn: 1.5, bUp: 0.5 })],
    [1.05, as({ ...WIDE, lean: 0.15, lhX: 0.42, lhY: 0.15, lhZ: 0.2, rhX: -0.42, rhY: 0.2, rhZ: 0.2, bTurn: 1.5, bUp: 0.5 })],
    [1.5, {}],
  ],
};

// Vortex: spun round and round where he stands, his axe out level, and back.
export const VORTEX: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...WIDE, ...SWUNG })],
    [0.6, as({ ...WIDE, ...SWUNG, spin: Math.PI })],
    [0.9, as({ ...WIDE, ...SWUNG, spin: Math.PI * 2 })],
    [1.2, as({ ...WIDE, ...SWUNG, spin: Math.PI * 3 })],
    [1.3, as({ ...WIDE, ...SWUNG, spin: Math.PI * 4 })],
    [1.6, { spin: Math.PI * 4 }],
  ],
};
