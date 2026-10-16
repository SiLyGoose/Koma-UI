import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LOW, LUNGE, TUCKED } from '../moves/stances';

/*
 * What Morrah's body does for her attack and her three skills: a knight's, Carprain in her right hand and her
 * shield on her left arm. She stands, runs in and attacks as Klaus does, by his rig (../../assets/heroes/morrah.ts):
 * her attack here is for a computer without it. They are written from how she stands (STAND), not from a swordsman's
 * rest. What comes of each is in ./index.ts.
 */

/** How she stands: ready and unbothered, her shield before her, her sword out to her right with its point down a little ahead. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.03,
  hipTurn: -0.08,
  lean: 0.02,
  tilt: 0.03,
  lfX: 0.05,
  lfZ: 0.1,
  rfX: -0.05,
  rfZ: -0.08,
  lhX: 0.13,
  lhY: 0.24,
  lhZ: 0.3,
  rhX: -0.3,
  rhY: 0.06,
  rhZ: 0.14,
  bTurn: 5.9,
  bUp: -0.5,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

// Her attack: her sword swung across from her right to her left, and back from her left to her right, her shield kept before her.
export const CLEAVE: Move = {
  keys: [
    [0, {}],
    [0.18, as({ ...LOW, twist: -0.55, lean: 0.06, rhX: -0.4, rhY: 0.26, rhZ: -0.08, bTurn: 4.4, bUp: 0.2, lhX: 0.1, lhY: 0.3, lhZ: 0.36 })],
    [0.3, as({ ...LOW, hipZ: 0.08, twist: 0.5, lean: 0.2, rhX: 0.28, rhY: 0.2, rhZ: 0.36, bTurn: 7.2, bUp: 0, lhX: 0.22, lhY: 0.26, lhZ: 0.1 })],
    [0.44, as({ ...LOW, hipZ: 0.06, twist: 0.62, lean: 0.16, rhX: 0.34, rhY: 0.24, rhZ: 0.22, bTurn: 7.8, bUp: 0.2, lhX: 0.22, lhY: 0.26, lhZ: 0.08 })],
    [0.6, as({ ...LOW, hipZ: 0.08, twist: -0.5, lean: 0.2, rhX: -0.34, rhY: 0.2, rhZ: 0.32, bTurn: 5.3, bUp: 0, lhX: 0.1, lhY: 0.3, lhZ: 0.36 })],
    [0.74, as({ ...LOW, hipZ: 0.06, twist: -0.6, lean: 0.14, rhX: -0.4, rhY: 0.22, rhZ: 0.18, bTurn: 4.8, bUp: 0.15, lhX: 0.1, lhY: 0.3, lhZ: 0.36 })],
    [1.15, {}],
  ],
};

// Burning Power: her sword raised high overhead (its flames gather), held, then a lunge in with it brought down on the ground ahead (the boss knocked down), and back.
export const BURNING: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: -0.05, twist: 0.3, nod: -0.1, rhX: -0.16, rhY: 0.72, rhZ: -0.02, bTurn: 6.28, bUp: 1.7, lhX: 0.16, lhY: 0.26, lhZ: 0.3 })],
    [0.55, as({ ...COILED, hipY: -0.22, lean: -0.08, twist: 0.35, nod: -0.12, rhX: -0.16, rhY: 0.76, rhZ: -0.04, bTurn: 6.28, bUp: 1.85, lhX: 0.16, lhY: 0.26, lhZ: 0.3 })],
    [0.75, as({ ...LUNGE, ahead: 1.2, lean: 0.42, twist: -0.3, nod: 0.08, rhX: -0.08, rhY: 0.04, rhZ: 0.5, bTurn: 6.28, bUp: -0.7, lhX: 0.18, lhY: 0.16, lhZ: 0.2 })],
    [1, as({ ...LUNGE, hipY: -0.29, ahead: 1.25, lean: 0.4, twist: -0.32, nod: 0.06, rhX: -0.08, rhY: 0.03, rhZ: 0.48, bTurn: 6.28, bUp: -0.68, lhX: 0.18, lhY: 0.16, lhZ: 0.2 })],
    [1.5, {}],
  ],
};

// Hellfire: her sword drawn up, then driven point down into the ground at her right side as she sinks low, her shield raised and her head thrown back (the fire goes up round her), held, and up again.
export const HELLFIRE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.1, twist: 0.2, rhX: -0.24, rhY: 0.5, rhZ: 0.1, bTurn: 6.28, bUp: 1.2, lhX: 0.14, lhY: 0.3, lhZ: 0.36 })],
    [0.55, as({ ...LOW, hipY: -0.22, lean: 0.25, twist: -0.1, nod: -0.25, rhX: -0.2, rhY: -0.08, rhZ: 0.3, bTurn: 6.28, bUp: -1.45, lhX: 0.1, lhY: 0.36, lhZ: 0.42 })],
    [1.1, as({ ...LOW, hipY: -0.21, lean: 0.22, twist: -0.12, nod: -0.3, rhX: -0.2, rhY: -0.07, rhZ: 0.3, bTurn: 6.28, bUp: -1.45, lhX: 0.1, lhY: 0.38, lhZ: 0.42 })],
    [1.5, {}],
  ],
};

// Lava Eruption: her sword swung round behind her, a leap with it raised overhead, and down on one knee with it driven into the ground (the lava bursts up under the boss), and up again.
export const ERUPTION: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, twist: 0.6, lean: 0.05, rhX: -0.34, rhY: 0.3, rhZ: -0.2, bTurn: 3.6, bUp: 1.4, lhX: 0.18, lhY: 0.24, lhZ: 0.32 })],
    [0.6, as({ ...TUCKED, ahead: 0.8, jump: 0.9, lean: -0.1, twist: 0.2, rhX: -0.12, rhY: 0.8, rhZ: 0, bTurn: 6.28, bUp: 2.1, lhX: 0.2, lhY: 0.34, lhZ: 0.24 })],
    [0.82, as({ ...KNEELING, ahead: 1.4, lean: 0.5, twist: -0.1, rhX: -0.06, rhY: 0, rhZ: 0.46, bTurn: 6.28, bUp: -1.3, lhX: 0.2, lhY: 0.12, lhZ: 0.3 })],
    [1.2, as({ ...KNEELING, hipY: -0.4, ahead: 1.4, lean: 0.46, twist: -0.12, rhX: -0.06, rhY: 0, rhZ: 0.44, bTurn: 6.28, bUp: -1.28, lhX: 0.2, lhY: 0.12, lhZ: 0.3 })],
    [1.75, {}],
  ],
};
