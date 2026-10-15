import { at } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LUNGE, TALL, WIDE } from '../moves/stances';

/*
 * What Seria's body does for her skills: a swordswoman's, her sword in her right hand and its sheath in her left.
 * She stands as a swordsman does, and attacks as most do (../moves/common.ts). What comes of each is in ./index.ts.
 */

// Mysterious Sword - Falling Petals: her sword drawn back to her right, then a lunge with it swept across in front of her to her left, and back.
export const PETALS: Move = {
  keys: [
    [0, {}],
    [0.18, at({ ...COILED, twist: -0.5, lean: 0.08, rhX: -0.36, rhY: 0.22, rhZ: -0.1, bTurn: 4.3, bUp: 0.15, lhX: 0.2, lhY: 0.05, lhZ: 0.1 })],
    [0.32, at({ ...LUNGE, ahead: 1.6, lean: 0.3, twist: 0.6, rhX: 0.3, rhY: 0.22, rhZ: 0.3, bTurn: 7.5, bUp: 0.05, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [0.5, at({ ...LUNGE, hipY: -0.29, ahead: 1.7, lean: 0.26, twist: 0.66, rhX: 0.32, rhY: 0.24, rhZ: 0.2, bTurn: 7.8, bUp: 0.1, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [0.9, {}],
  ],
};

// Mysterious Sword - Blossom: her sword raised straight up overhead, then brought straight down ahead of her in a lunge, and back.
export const BLOSSOM: Move = {
  keys: [
    [0, {}],
    [0.2, at({ ...COILED, lean: -0.05, nod: -0.1, rhX: -0.12, rhY: 0.7, rhZ: 0, bTurn: 6.28, bUp: 1.8, lhX: 0.2, lhY: 0.05, lhZ: 0.1 })],
    [0.36, at({ ...LUNGE, ahead: 1.5, lean: 0.45, rhX: -0.06, rhY: 0.06, rhZ: 0.48, bTurn: 6.28, bUp: -0.7, lhX: 0.22, lhY: 0.02, lhZ: -0.12 })],
    [0.55, at({ ...LUNGE, hipY: -0.3, ahead: 1.55, lean: 0.42, rhX: -0.06, rhY: 0.05, rhZ: 0.46, bTurn: 6.28, bUp: -0.68, lhX: 0.22, lhY: 0.02, lhZ: -0.12 })],
    [0.95, {}],
  ],
};

// Blood Scattering Blade: down low, then a rush far forward with a cut across, a cut back, and a last cut across, and back.
export const SCATTER: Move = {
  keys: [
    [0, {}],
    [0.15, at({ ...COILED, hipY: -0.24, lean: 0.3, twist: -0.4, rhX: -0.34, rhY: 0.1, rhZ: -0.2, bTurn: 4, bUp: 0, lhX: 0.2, lhY: 0.05, lhZ: 0.1 })],
    [0.3, at({ ...LUNGE, ahead: 3.2, lean: 0.5, twist: 0.6, rhX: 0.3, rhY: 0.2, rhZ: 0.3, bTurn: 7.5, bUp: 0, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [0.48, at({ ...WIDE, ahead: 3.3, lean: 0.3, twist: -0.55, rhX: -0.34, rhY: 0.22, rhZ: 0.3, bTurn: 5.2, bUp: 0.1, lhX: 0.24, lhY: 0.1, lhZ: 0.1 })],
    [0.66, at({ ...LUNGE, ahead: 3.4, lean: 0.4, twist: 0.55, rhX: 0.3, rhY: 0.24, rhZ: 0.3, bTurn: 7.6, bUp: 0.1, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [0.85, at({ ...LUNGE, hipY: -0.29, ahead: 3.4, lean: 0.36, twist: 0.6, rhX: 0.32, rhY: 0.24, rhZ: 0.22, bTurn: 7.8, bUp: 0.1, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [1.3, {}],
  ],
};

// Red Moon Blade: drawn up tall with her sword raised to the moon, held, then low and wide with it swung round one way and back the other, and back.
export const MOON: Move = {
  keys: [
    [0, {}],
    [0.3, at({ ...TALL, lean: -0.15, nod: -0.3, twist: 0.3, rhX: -0.14, rhY: 0.78, rhZ: 0, bTurn: 6.28, bUp: 1.9, lhX: 0.22, lhY: 0.1, lhZ: 0.1 })],
    [0.7, at({ ...TALL, lean: -0.17, nod: -0.32, twist: 0.32, rhX: -0.14, rhY: 0.8, rhZ: 0, bTurn: 6.28, bUp: 1.95, lhX: 0.22, lhY: 0.1, lhZ: 0.1 })],
    [0.9, at({ ...WIDE, ahead: 1, lean: 0.3, twist: -0.6, rhX: -0.36, rhY: 0.2, rhZ: 0.3, bTurn: 4.6, bUp: 0, lhX: 0.24, lhY: 0.1, lhZ: 0.1 })],
    [1.05, at({ ...WIDE, ahead: 1.1, lean: 0.32, twist: 0.7, rhX: 0.34, rhY: 0.2, rhZ: 0.28, bTurn: 7.9, bUp: 0, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [1.3, at({ ...WIDE, hipY: -0.32, ahead: 1.1, lean: 0.3, twist: 0.72, rhX: 0.34, rhY: 0.22, rhZ: 0.22, bTurn: 8, bUp: 0.1, lhX: 0.24, lhY: 0.05, lhZ: -0.15 })],
    [1.8, {}],
  ],
};
