import { at } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LOW, LUNGE, TUCKED } from '../moves/stances';

/*
 * What Clause's body does for his three skills and his attack: a knight's, a sword in his right hand
 * and a shield on his left arm. What comes of each is in ./index.ts.
 */

/**
 * How a knight stands ready, as its moves begin and end (its own animation, when it has one, shows either
 * side of them): its sword out to its right and ahead, a little down, its shield before it.
 */
const READY = { hipX: 0, tilt: 0, hipY: -0.04, lfX: 0.04, lfZ: 0.14, rfX: -0.05, rfZ: -0.1, rhX: -0.32, rhY: 0.14, rhZ: 0.18, bTurn: 5.6, bUp: -0.15, lhX: 0.12, lhY: 0.28, lhZ: 0.34 };

// Down low, a leap with the sword raised overhead, and down on one knee with it driven into the ground ahead.
export const SLAM: Move = {
  keys: [
    [0, at(READY)],
    [0.25, at({ ...COILED, hipY: -0.26, lean: 0.22, rhX: -0.2, rhY: 0.1, rhZ: -0.1, bTurn: 6.28, bUp: 1.2, lhX: 0.2, lhY: 0.2, lhZ: 0.3 })],
    [0.55, at({ ...TUCKED, ahead: 1.4, jump: 2.2, lean: -0.2, rhX: -0.12, rhY: 0.78, rhZ: -0.05, bTurn: 6.28, bUp: 2, lhX: 0.22, lhY: 0.36, lhZ: 0.2 })],
    [0.78, at({ ...KNEELING, ahead: 2.4, lean: 0.5, rhX: -0.06, rhY: 0.02, rhZ: 0.48, bTurn: 6.28, bUp: -0.9, lhX: 0.2, lhY: 0.1, lhZ: 0.3 })],
    [1.05, at({ ...KNEELING, hipY: -0.4, ahead: 2.4, lean: 0.46, rhX: -0.06, rhY: 0.02, rhZ: 0.46, bTurn: 6.28, bUp: -0.86, lhX: 0.2, lhY: 0.1, lhZ: 0.3 })],
    [1.6, at(READY)],
  ],
  lands: [0.78],
};

// The shield drawn back across it, then a step in with the shield thrust out ahead, held, and back.
export const BASH: Move = {
  keys: [
    [0, at(READY)],
    [0.22, at({ ...COILED, twist: 0.5, lean: 0.05, lhX: 0.3, lhY: 0.3, lhZ: -0.05, rhX: -0.3, rhY: 0.1, rhZ: -0.15, bTurn: 3.6, bUp: 0.2 })],
    [0.4, at({ ...LUNGE, ahead: 2, lean: 0.34, twist: -0.6, lhX: 0.06, lhY: 0.36, lhZ: 0.56, rhX: -0.3, rhY: 0.05, rhZ: -0.2, bTurn: 3.4, bUp: 0 })],
    [0.6, at({ ...LUNGE, hipY: -0.29, ahead: 2.05, lean: 0.3, twist: -0.62, lhX: 0.06, lhY: 0.36, lhZ: 0.54, rhX: -0.3, rhY: 0.05, rhZ: -0.2, bTurn: 3.4, bUp: 0 })],
    [1.1, at(READY)],
  ],
  lands: [0.4],
};

// Feet planted wide, the shield brought up square in front of it and the sword raised: held, and down.
export const GUARD: Move = {
  keys: [
    [0, at(READY)],
    [0.3, at({ ...LOW, lean: 0.12, twist: -0.25, lhX: 0.08, lhY: 0.3, lhZ: 0.42, rhX: -0.28, rhY: 0.2, rhZ: 0, bTurn: 6.28, bUp: 1 })],
    [0.5, at({ ...LOW, hipY: -0.14, lean: 0.1, twist: -0.3, lhX: 0.06, lhY: 0.38, lhZ: 0.46, rhX: -0.24, rhY: 0.7, rhZ: 0, bTurn: 6.28, bUp: 1.57 })],
    [1.05, at({ ...LOW, hipY: -0.13, lean: 0.1, twist: -0.3, lhX: 0.06, lhY: 0.39, lhZ: 0.46, rhX: -0.24, rhY: 0.72, rhZ: 0, bTurn: 6.28, bUp: 1.6 })],
    [1.5, at(READY)],
  ],
  lands: [0.5],
};

// A knight's attack: the sword swung across from its right to its left, and back from its left to its right, its shield kept before it.
export const SWING: Move = {
  keys: [
    [0, at(READY)],
    [0.18, at({ ...LOW, twist: -0.55, lean: 0.06, rhX: -0.4, rhY: 0.26, rhZ: -0.08, bTurn: 4.4, bUp: 0.2, lhX: 0.1, lhY: 0.3, lhZ: 0.36 })],
    [0.3, at({ ...LOW, hipZ: 0.08, twist: 0.5, lean: 0.2, rhX: 0.28, rhY: 0.2, rhZ: 0.36, bTurn: 7.2, bUp: 0, lhX: 0.22, lhY: 0.26, lhZ: 0.1 })],
    [0.44, at({ ...LOW, hipZ: 0.06, twist: 0.62, lean: 0.16, rhX: 0.34, rhY: 0.24, rhZ: 0.22, bTurn: 7.8, bUp: 0.2, lhX: 0.22, lhY: 0.26, lhZ: 0.08 })],
    [0.6, at({ ...LOW, hipZ: 0.08, twist: -0.5, lean: 0.2, rhX: -0.34, rhY: 0.2, rhZ: 0.32, bTurn: 5.3, bUp: 0, lhX: 0.1, lhY: 0.3, lhZ: 0.36 })],
    [0.74, at({ ...LOW, hipZ: 0.06, twist: -0.6, lean: 0.14, rhX: -0.4, rhY: 0.22, rhZ: 0.18, bTurn: 4.8, bUp: 0.15, lhX: 0.1, lhY: 0.3, lhZ: 0.36 })],
    [1.15, at(READY)],
  ],
  lands: [0.3, 0.6],
};
