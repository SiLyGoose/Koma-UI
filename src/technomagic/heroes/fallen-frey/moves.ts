import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL } from '../moves/stances';

/*
 * What Fallen Frey's body does for her attack and her three skills: a priestess's, her weapon held in
 * her left hand and her right hand free. They are written from how she stands (STAND), not from a
 * swordsman's rest. What comes of each is in ./index.ts.
 */

/** How she stands: upright, her weight on both feet, her weapon held before her at her waist, her right hand loose at her side. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.01,
  hipTurn: -0.06,
  lean: 0,
  tilt: 0.02,
  lfX: 0.05,
  lfZ: 0.05,
  rfX: -0.03,
  rfZ: -0.03,
  lhX: 0.18,
  lhY: 0.02,
  lhZ: 0.16,
  rhX: -0.21,
  rhY: -0.12,
  rhZ: 0.02,
  // Her free hand pointing down, a little ahead.
  bTurn: 0,
  bUp: -1.3,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Off the floor, her feet hanging, toes down. */
const HOVER = { hipX: 0, tilt: 0, hipY: 0.02, lfX: 0.04, lfY: 0.06, lfZ: 0.04, lfTip: 0.7, rfX: -0.04, rfY: 0.14, rfZ: -0.06, rfTip: 0.7 };

// Her attack: her weapon drawn back beside her head, then thrust out at the boss with a step in (a bolt of dark light), and back.
export const SMITE: Move = {
  keys: [
    [0, {}],
    [0.22, as({ twist: 0.35, lean: -0.06, nod: -0.05, lhX: 0.24, lhY: 0.42, lhZ: -0.04, rhX: -0.24, rhY: 0.05, rhZ: 0.1 })],
    [0.38, as({ ...LOW, twist: -0.4, lean: 0.18, lhX: 0.08, lhY: 0.32, lhZ: 0.5, rhX: -0.26, rhY: -0.04, rhZ: -0.12 })],
    [0.6, as({ ...LOW, hipY: -0.11, twist: -0.42, lean: 0.16, lhX: 0.08, lhY: 0.31, lhZ: 0.48, rhX: -0.26, rhY: -0.04, rhZ: -0.12 })],
    [1, {}],
  ],
};

// Light of Doom: both hands gathered before her, then raised high (the light comes down on her allies), then thrust out ahead (it bursts).
// (Drawn by her Mixamo rig's animation where it is on the computer: ../../assets/heroes/fallen-frey.ts.)
export const LIGHT: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.2, nod: 0.15, lhX: 0.12, lhY: 0.08, lhZ: 0.24, rhX: -0.12, rhY: 0.08, rhZ: 0.24 })],
    [0.55, as({ ...TALL, lean: -0.18, nod: -0.3, lhX: 0.12, lhY: 0.78, lhZ: 0.08, rhX: -0.2, rhY: 0.62, rhZ: 0.06, bUp: 1.4 })],
    [0.8, as({ ...TALL, lean: -0.2, nod: -0.32, lhX: 0.12, lhY: 0.8, lhZ: 0.08, rhX: -0.2, rhY: 0.64, rhZ: 0.06, bUp: 1.45 })],
    [1.05, as({ ...LOW, twist: -0.3, lean: 0.25, lhX: 0.06, lhY: 0.26, lhZ: 0.5, rhX: -0.22, rhY: 0.2, rhZ: 0.4, bUp: 0 })],
    [1.25, as({ ...LOW, hipY: -0.11, twist: -0.32, lean: 0.23, lhX: 0.06, lhY: 0.25, lhZ: 0.48, rhX: -0.22, rhY: 0.19, rhZ: 0.38, bUp: 0 })],
    [1.7, {}],
  ],
};

// Blessing of Doom: bowed, her hands together as if to pray, then up on her toes with her weapon raised high overhead and her free hand flung wide (the shields), held, and down.
export const BLESSING: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.25, nod: 0.25, lhX: 0.1, lhY: 0.15, lhZ: 0.2, rhX: -0.1, rhY: 0.15, rhZ: 0.2, bUp: -0.4 })],
    [0.6, as({ ...TALL, jump: 0.15, lean: -0.15, nod: -0.25, lhX: 0.24, lhY: 0.86, lhZ: 0.08, rhX: -0.5, rhY: 0.45, rhZ: 0.05, bTurn: -1.4, bUp: 0.5 })],
    [0.95, as({ ...TALL, jump: 0.18, lean: -0.17, nod: -0.27, lhX: 0.24, lhY: 0.88, lhZ: 0.08, rhX: -0.51, rhY: 0.47, rhZ: 0.05, bTurn: -1.4, bUp: 0.55 })],
    [1.45, {}],
  ],
};

// Heaven's Vengeance: twenty blows, as the light comes down on the boss again and again while she hangs in the air.
// Gathered in, then up off the floor with both hands stretched out ahead at the boss holding her weapon (the bolts go up from it), there while it is struck, and down.
const STRETCHED = { lhX: 0.05, lhY: 0.34, lhZ: 0.5, rhX: -0.05, rhY: 0.28, rhZ: 0.49, bTurn: 0, bUp: 0.3 };
export const VENGEANCE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.2, lhX: 0.16, lhY: 0.1, lhZ: 0.2, rhX: -0.16, rhY: 0.05, rhZ: 0.1 })],
    [0.65, as({ ...HOVER, ...STRETCHED, jump: 0.9, lean: 0.04, nod: -0.05 })],
    [1.8, as({ ...HOVER, ...STRETCHED, jump: 1.05, lean: 0.05, nod: -0.06, lhY: 0.35, rhY: 0.29 })],
    [3.05, as({ ...HOVER, ...STRETCHED, jump: 0.95, lean: 0.04, nod: -0.05 })],
    [3.45, as({ ...COILED, lean: 0.15 })],
    [3.85, {}],
  ],
};
