import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LUNGE, TALL, WIDE } from '../moves/stances';

/*
 * What Phillop's body does for his attack and his three skills: a dwarf knight's, his axe in his right hand and his
 * shield on his left arm. They are written from how he stands (STAND), not from a swordsman's rest. What comes of each
 * is in ../../sim/heroes/phillop.ts.
 */

/** How he stands: square and planted, his shield before him, his axe over his right shoulder. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.03,
  hipTurn: -0.06,
  lean: 0.04,
  tilt: 0.02,
  lfX: 0.06,
  lfZ: 0.08,
  rfX: -0.06,
  rfZ: -0.06,
  lhX: 0.16,
  lhY: 0.18,
  lhZ: 0.26,
  rhX: -0.28,
  rhY: 0.3,
  rhZ: 0.02,
  bTurn: 3.4,
  bUp: 0.9,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His axe raised high over his head, its blade behind him. */
const RAISED = { rhX: -0.2, rhY: 0.62, rhZ: -0.05, bTurn: 0, bUp: 2.4 };
/** Brought down before him, its blade at the boss's feet. */
const DOWN = { rhX: -0.08, rhY: 0.12, rhZ: 0.5, bTurn: 0, bUp: -0.5 };
/** His shield thrust out before him. */
const BASHING = { lhX: 0.06, lhY: 0.22, lhZ: 0.48 };

// His attack: his axe raised high and brought down on the boss, and back.
export const HEW: Move = {
  keys: [
    [0, {}],
    [0.28, as({ ...COILED, lean: -0.08, ...RAISED })],
    [0.45, as({ ...LUNGE, ahead: 0.6, lean: 0.3, ...DOWN })],
    [0.65, as({ ...LUNGE, ahead: 0.62, hipY: -0.28, lean: 0.28, ...DOWN })],
    [1.1, {}],
  ],
};

// Collision: a short charge behind his shield, slammed into the boss (it is knocked down), and back.
export const COLLISION: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.25, ...BASHING, lhZ: 0.3 })],
    [0.6, as({ ...LUNGE, ahead: 1.6, lean: 0.4, ...BASHING })],
    [0.85, as({ ...LUNGE, ahead: 1.65, hipY: -0.28, lean: 0.36, ...BASHING })],
    [1.4, {}],
  ],
};

// Headbutt: head down, a dash at the boss and his helmeted head driven into it, and back.
export const HEADBUTT: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.35, nod: 0.4 })],
    [0.5, as({ ...LUNGE, ahead: 1.8, lean: 0.55, nod: 0.5 })],
    [0.7, as({ ...LUNGE, ahead: 1.7, lean: 0.3, nod: 0.1 })],
    [1.2, {}],
  ],
};

// Earth Incarnate: his axe and shield thrown wide and his head back as the earth rises into him, held, then his feet stamped wide, and back.
export const INCARNATE: Move = {
  keys: [
    [0, {}],
    [0.4, as({ ...TALL, lean: -0.2, nod: -0.35, rhX: -0.45, rhY: 0.4, rhZ: 0.05, bTurn: 1.5, bUp: 1.2, lhX: 0.45, lhY: 0.4, lhZ: 0.05 })],
    [0.8, as({ ...WIDE, hipZ: 0, lean: 0.12, nod: 0.05, rhX: -0.4, rhY: 0.1, rhZ: 0.1, bTurn: 1.5, bUp: 0, lhX: 0.4, lhY: 0.1, lhZ: 0.1 })],
    [1.15, as({ ...WIDE, hipZ: 0, hipY: -0.31, lean: 0.1, rhX: -0.4, rhY: 0.1, rhZ: 0.1, bTurn: 1.5, bUp: 0, lhX: 0.4, lhY: 0.1, lhZ: 0.1 })],
    [1.6, {}],
  ],
};
