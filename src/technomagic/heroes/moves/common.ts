import { at, TURN } from '../body/pose';
import type { Move } from './move';
import { COILED, KNEELING, LOW, LUNGE, SPLIT, TALL, TUCKED, WIDE } from './stances';

/* The moves every hero has: its attack, a plain cast, and being hit. */

/*
 * Its attack, five blows: a lunge with a sweep from its right to its left; the same sweep back; a jump,
 * with a cut down from its left to its right; a stab straight ahead, and the blade drawn back; then a
 * flip, the blade brought down as it lands. Then back to where it stood. Once it has flipped, every
 * pose after has the turn in it.
 */
export const ATTACK: Move = {
  keys: [
    [0, {}],
    // Coiled, the blade swung round behind it and out to its right.
    [0.16, at({ ...COILED, twist: -0.6, lean: 0.1, rhX: -0.36, rhY: 0.2, rhZ: -0.12, bTurn: 4.2, bUp: 0.1, lhX: 0.22, lhY: 0.1, lhZ: 0.16 })],
    // 1: the lunge, long and low, sweeping across in front of it to its left, and on round.
    [0.29, at({ ...LUNGE, ahead: 1.9, lean: 0.32, twist: 0.55, rhX: 0.26, rhY: 0.2, rhZ: 0.34, bTurn: 7.3, bUp: 0, lhX: 0.26, lhY: 0.1, lhZ: -0.18 })],
    [0.38, at({ ...LUNGE, hipY: -0.29, ahead: 2, lean: 0.28, twist: 0.68, rhX: 0.32, rhY: 0.22, rhZ: 0.22, bTurn: 7.7, bUp: 0.1, lhX: 0.26, lhY: 0.1, lhZ: -0.2 })],
    // 2: the same sweep back, to its right, its weight swung back between its feet, and on round.
    [0.5, at({ ...WIDE, ahead: 2.1, lean: 0.24, twist: -0.55, rhX: -0.34, rhY: 0.2, rhZ: 0.3, bTurn: 5.25, bUp: 0, lhX: 0.24, lhY: 0.14, lhZ: 0.12 })],
    // Its feet drawn in under it, to spring.
    [0.62, at({ ...COILED, ahead: 2.15, hipY: -0.16, lean: 0.1, twist: -0.65, rhX: -0.38, rhY: 0.12, rhZ: 0.16, bTurn: 4.9, bUp: 0.15, lhX: 0.24, lhY: 0.06, lhZ: 0.12 })],
    // Up, its knees pulled up, the blade carried on round behind it and raised over its left shoulder.
    [0.8, at({ ...TUCKED, ahead: 2.2, jump: 1.2, lean: -0.15, twist: 0.45, rhX: 0.16, rhY: 0.6, rhZ: 0, bTurn: 2.1, bUp: 1.05, lhX: 0.24, lhY: 0.2, lhZ: 0.1 })],
    // 3: down into a lunge, cutting from its left to its right.
    [0.92, at({ ...LUNGE, hipY: -0.3, ahead: 2.3, lean: 0.42, twist: -0.5, rhX: -0.3, rhY: 0.04, rhZ: 0.36, bTurn: -0.67, bUp: -0.47, lhX: 0.24, lhY: 0.1, lhZ: -0.12 })],
    // Drawn up tall, the blade brought up level and back to stab.
    [1.06, at({ ...TALL, ahead: 2.25, hipZ: -0.06, lean: -0.04, twist: -0.4, rhX: -0.2, rhY: 0.26, rhZ: -0.2, bTurn: 0, bUp: 0.02, lhX: 0.16, lhY: 0.22, lhZ: 0.28 })],
    // 4: the stab, straight ahead, in the longest lunge of all.
    [1.15, at({ ...LUNGE, hipY: -0.31, hipZ: 0.2, lfZ: 0.58, rfZ: -0.46, ahead: 2.6, lean: 0.5, twist: 0.3, rhX: -0.04, rhY: 0.34, rhZ: 0.5, bTurn: 0, bUp: 0, lhX: 0.24, lhY: 0.12, lhZ: -0.22 })],
    [1.25, at({ ...LUNGE, hipY: -0.31, hipZ: 0.19, lfZ: 0.58, rfZ: -0.46, ahead: 2.62, lean: 0.46, twist: 0.34, rhX: -0.04, rhY: 0.34, rhZ: 0.48, bTurn: 0, bUp: 0.03, lhX: 0.24, lhY: 0.12, lhZ: -0.22 })],
    // Its feet drawn in again, the blade brought back up and over, behind it.
    [1.4, at({ ...COILED, ahead: 2.45, hipY: -0.24, lean: 0.15, twist: -0.2, rhX: -0.22, rhY: 0.24, rhZ: -0.14, bTurn: 0, bUp: 2.6, lhX: 0.22, lhY: 0.14, lhZ: 0.1 })],
    // The flip: over, its legs thrown apart, the blade behind its head.
    [1.6, at({ ...SPLIT, ahead: 2.5, jump: 1.5, flip: TURN * 0.6, lean: 0.2, rhX: -0.08, rhY: 0.6, rhZ: -0.06, bTurn: 0, bUp: 2.5, lhX: 0.16, lhY: 0.4, lhZ: 0.1 })],
    // 5: landing almost on one knee, the blade brought over and down ahead of it.
    [1.76, at({ ...KNEELING, ahead: 2.7, flip: TURN, lean: 0.5, rhX: -0.06, rhY: 0.12, rhZ: 0.46, bTurn: 0, bUp: -0.52, lhX: 0.14, lhY: 0.1, lhZ: 0.36 })],
    [1.88, at({ ...KNEELING, hipY: -0.4, ahead: 2.7, flip: TURN, lean: 0.45, rhX: -0.06, rhY: 0.12, rhZ: 0.44, bTurn: 0, bUp: -0.48, lhX: 0.14, lhY: 0.1, lhZ: 0.34 })],
    // A hop back to where it stood, its knees up and the blade swung up and over behind it on the way, and down into standing.
    [2.14, at({ ...TUCKED, lfY: 0.16, rfY: 0.22, ahead: 1.3, jump: 0.55, flip: TURN, lean: -0.1, rhX: -0.26, rhY: 0.12, rhZ: -0.04, bTurn: 0.6, bUp: 2.2, lhX: 0.24, lhY: 0.04, lhZ: 0.1 })],
    [2.38, at({ ...COILED, hipY: -0.14, ahead: 0.06, flip: TURN, lean: 0.1 })],
    [2.7, { flip: TURN }],
  ],
  lands: [0.3, 0.51, 0.93, 1.17, 1.77],
};

// Hit: thrown back off its front foot, head back and arms flung up, a step back, and standing again.
export const HIT: Move = {
  keys: [
    [0, {}],
    [0.08, { ahead: -0.35, hipZ: -0.1, hipY: -0.06, lean: -0.4, nod: -0.35, twist: 0.25, lfY: 0.06, lfZ: -0.05, lhX: 0.12, lhY: 0.36, lhZ: -0.1, rhX: -0.1, rhY: 0.3, rhZ: 0.05, bTurn: -0.5, bUp: -0.4 }],
    [0.25, { ahead: -0.55, hipZ: -0.06, hipY: -0.1, lean: -0.2, nod: 0.1, twist: 0.15, lhY: 0.1, rhY: 0.1 }],
    [0.6, {}],
  ],
  lands: [],
};

// Its ability: down low with the blade held across it in both hands, up with it raised overhead, held, and brought down ahead of it.
export const CAST: Move = {
  keys: [
    [0, {}],
    [0.3, at({ ...LOW, hipY: -0.18, lean: 0.25, twist: -0.2, nod: 0.15, rhX: -0.1, rhY: 0.1, rhZ: 0.26, bTurn: 1.1, bUp: 0.32, lhX: 0.14, lhY: 0.14, lhZ: 0.28 })],
    [0.6, at({ hipX: 0, tilt: 0, hipY: 0, lean: -0.08, twist: -0.3, nod: -0.2, rhX: -0.14, rhY: 0.7, rhZ: 0.02, bTurn: 1.1, bUp: 1.6, lhX: 0.22, lhY: 0.05, lhZ: 0.16 })],
    [0.9, at({ hipX: 0, tilt: 0, hipY: 0.01, lean: -0.12, twist: -0.35, nod: -0.22, rhX: -0.14, rhY: 0.72, rhZ: -0.02, bTurn: 1.1, bUp: 1.75, lhX: 0.22, lhY: 0.06, lhZ: 0.16 })],
    [1, at({ ...LOW, ahead: 0.5, hipY: -0.16, hipZ: 0.1, lean: 0.38, twist: 0.4, nod: 0.1, lfZ: 0.24, rhX: -0.02, rhY: 0, rhZ: 0.48, bTurn: 0.1, bUp: -0.46, lhX: 0.22, lhY: 0.02, lhZ: -0.16 })],
    [1.15, at({ ...LOW, ahead: 0.5, hipY: -0.15, hipZ: 0.1, lean: 0.34, twist: 0.42, lfZ: 0.24, rhX: -0.02, rhY: -0.02, rhZ: 0.46, bTurn: 0.1, bUp: -0.44, lhX: 0.22, lhY: 0.02, lhZ: -0.16 })],
    [1.6, {}],
  ],
  lands: [1],
};
