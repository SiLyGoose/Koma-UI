import { at, TURN } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, LUNGE, TALL } from '../moves/stances';

/*
 * What Kirze's body does for her three skills. What comes of each (the hits, what they do to the boss,
 * what is drawn) is in ./index.ts.
 */

/** The blade held out level to its right, to spin with. */
const OUT = { rhX: -0.42, rhY: 0.24, rhZ: 0.02, bTurn: 4.71, bUp: 0.05, lhX: 0.3, lhY: 0.26, lhZ: 0 };

// A rush in, spinning four times round with the blade held out (seven cuts as it comes past), then the blade raised and brought down in front of it.
export const JUDGMENT: Move = {
  keys: [
    [0, {}],
    [0.2, at({ ...COILED, ...OUT, ahead: 1.4, twist: -0.5, lean: 0.12 })],
    [1.25, at({ ...LOW, ...OUT, ahead: 2.3, spin: TURN * 4, twist: -0.3, lean: 0.12 })],
    [1.45, at({ ...TALL, ahead: 2.3, spin: TURN * 4, lean: -0.18, rhX: -0.1, rhY: 0.7, rhZ: -0.04, bTurn: 6.28, bUp: 1.9, lhX: 0.12, lhY: 0.6, lhZ: 0 })],
    [1.58, at({ ...LUNGE, ahead: 2.7, spin: TURN * 4, lean: 0.5, rhX: -0.05, rhY: 0.02, rhZ: 0.48, bTurn: 6.28, bUp: -0.5, lhX: 0.1, lhY: 0.04, lhZ: 0.4 })],
    [1.78, at({ ...LUNGE, hipY: -0.3, ahead: 2.7, spin: TURN * 4, lean: 0.46, rhX: -0.05, rhY: 0.02, rhZ: 0.46, bTurn: 6.28, bUp: -0.48, lhX: 0.1, lhY: 0.04, lhZ: 0.38 })],
    [2.4, { spin: TURN * 4 }],
  ],
};

// Gathered in low, then up off the floor with the blade thrust straight overhead, held there as it bursts, and down.
export const HAZE: Move = {
  keys: [
    [0, {}],
    [0.32, at({ ...COILED, hipY: -0.26, lean: 0.3, nod: 0.2, twist: -0.2, rhX: -0.06, rhY: 0.12, rhZ: 0.26, bTurn: 1.2, bUp: 0.2, lhX: 0.1, lhY: 0.14, lhZ: 0.26 })],
    [0.6, at({ ...TALL, jump: 0.5, lean: -0.2, nod: -0.3, rhX: -0.2, rhY: 0.74, rhZ: 0, bTurn: 0, bUp: 1.57, lhX: 0.34, lhY: 0.5, lhZ: 0 })],
    [1, at({ ...TALL, jump: 0.6, lean: -0.24, nod: -0.32, rhX: -0.2, rhY: 0.76, rhZ: 0, bTurn: 0, bUp: 1.6, lhX: 0.36, lhY: 0.52, lhZ: 0 })],
    [1.25, at({ ...COILED, lean: 0.15 })],
    [1.6, {}],
  ],
};

// The blade drawn back low, driven into the floor ahead of it (crystals come up in a line), held, then wrenched up overhead (they burst).
export const FLOWER: Move = {
  keys: [
    [0, {}],
    [0.28, at({ ...COILED, ahead: -0.2, twist: -0.6, lean: 0.05, rhX: -0.3, rhY: 0, rhZ: -0.25, bTurn: 3.4, bUp: -0.4, lhX: 0.2, lhY: 0.2, lhZ: 0.25 })],
    [0.45, at({ ...LUNGE, ahead: 0.6, lean: 0.5, twist: 0.35, rhX: -0.04, rhY: -0.02, rhZ: 0.5, bTurn: 0, bUp: -0.55, lhX: 0.24, lhY: 0.1, lhZ: -0.2 })],
    [0.95, at({ ...LUNGE, hipY: -0.3, ahead: 0.6, lean: 0.46, twist: 0.38, rhX: -0.04, rhY: -0.02, rhZ: 0.48, bTurn: 0, bUp: -0.55, lhX: 0.24, lhY: 0.1, lhZ: -0.2 })],
    [1.1, at({ ...TALL, ahead: 0.4, lean: -0.2, twist: -0.3, rhX: -0.16, rhY: 0.72, rhZ: 0, bTurn: 0.4, bUp: 1.8, lhX: 0.3, lhY: 0.3, lhZ: 0.1 })],
    [1.35, at({ ...TALL, ahead: 0.4, lean: -0.22, twist: -0.32, rhX: -0.16, rhY: 0.73, rhZ: 0, bTurn: 0.4, bUp: 1.85, lhX: 0.3, lhY: 0.3, lhZ: 0.1 })],
    [1.8, {}],
  ],
};
