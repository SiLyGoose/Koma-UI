import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, LUNGE, TALL } from '../moves/stances';

/*
 * What Lorraine's body does for her attack and her three skills: a sorceress's, her staff in her right hand and her
 * left free. They are written from how she stands (STAND), not from a swordsman's rest. What comes of each is in
 * ./index.ts.
 */

/** How she stands: upright, her weight on both feet, her staff held upright at her right side, her left hand loose. */
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
  lhX: 0.21,
  lhY: -0.12,
  lhZ: 0.02,
  rhX: -0.2,
  rhY: 0.06,
  rhZ: 0.12,
  // Her staff upright.
  bTurn: 0,
  bUp: 1.45,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her staff thrust out at the boss, its head toward it. */
const AIM = { rhX: -0.12, rhY: 0.32, rhZ: 0.46, bTurn: 0, bUp: 0.2 };

// Her attack: her staff drawn up and back, then thrust out at the boss with a step in (a thorn flies), and back.
export const LASH: Move = {
  keys: [
    [0, {}],
    [0.22, as({ twist: 0.3, lean: -0.05, rhX: -0.22, rhY: 0.36, rhZ: -0.04, bUp: 1.9 })],
    [0.4, as({ ...LOW, twist: -0.35, lean: 0.16, ...AIM })],
    [0.6, as({ ...LOW, hipY: -0.11, twist: -0.37, lean: 0.14, ...AIM, rhY: 0.31 })],
    [1, {}],
  ],
  lands: [0.42],
};

// Thornbush Forest: her staff raised, then thrust at the boss three times (thorns come up round it each time), and back.
export const THORNBUSH: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: -0.05, nod: -0.15, rhX: -0.16, rhY: 0.6, rhZ: 0.1, bUp: 1.6, lhX: 0.22, lhY: 0.2, lhZ: 0.2 })],
    [0.45, as({ ...LOW, twist: -0.3, lean: 0.15, ...AIM, rhZ: 0.45, bUp: 0.3, lhX: 0.24, lhY: 0.1, lhZ: 0.1 })],
    [0.7, as({ ...LOW, twist: -0.2, lean: 0.12, ...AIM, rhY: 0.4, rhZ: 0.42, bUp: 0.5, lhX: 0.24, lhY: 0.1, lhZ: 0.1 })],
    [0.95, as({ ...LOW, twist: -0.35, lean: 0.17, ...AIM, rhY: 0.33, bUp: 0.25, lhX: 0.24, lhY: 0.1, lhZ: 0.1 })],
    [1.4, {}],
  ],
  lands: [0.46, 0.71, 0.96],
};

// Tangled Vine: her staff drawn back to her right, then swept low along the ground at the boss in a lunge (the vine runs out to it), held, and back.
export const VINE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, twist: 0.4, lean: 0.1, rhX: -0.3, rhY: 0.2, rhZ: -0.1, bTurn: -0.8, bUp: 0.6 })],
    [0.55, as({ ...LUNGE, ahead: 0.6, lean: 0.35, twist: -0.4, rhX: -0.06, rhY: 0.06, rhZ: 0.5, bTurn: 0, bUp: -0.6, lhX: 0.24, lhY: 0.05, lhZ: -0.1 })],
    [0.9, as({ ...LUNGE, hipY: -0.29, ahead: 0.62, lean: 0.32, twist: -0.42, rhX: -0.06, rhY: 0.05, rhZ: 0.48, bTurn: 0, bUp: -0.58, lhX: 0.24, lhY: 0.05, lhZ: -0.1 })],
    [1.3, {}],
  ],
  lands: [0.56],
};

// Wrath of the Forest: up tall with both arms raised, her staff high, held, then down low with its foot driven into the ground (the forest bursts up under the boss), and back.
export const WRATH: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...TALL, lean: -0.15, nod: -0.3, rhX: -0.14, rhY: 0.78, rhZ: 0.05, bUp: 1.55, lhX: 0.2, lhY: 0.7, lhZ: 0.08 })],
    [0.75, as({ ...TALL, lean: -0.17, nod: -0.32, rhX: -0.14, rhY: 0.8, rhZ: 0.05, bUp: 1.57, lhX: 0.2, lhY: 0.72, lhZ: 0.08 })],
    [0.95, as({ ...LOW, hipY: -0.2, lean: 0.25, nod: 0.1, rhX: -0.12, rhY: 0.1, rhZ: 0.3, bUp: 1.45, lhX: 0.2, lhY: 0.1, lhZ: 0.25 })],
    [1.3, as({ ...LOW, hipY: -0.21, lean: 0.23, nod: 0.08, rhX: -0.12, rhY: 0.1, rhZ: 0.3, bUp: 1.45, lhX: 0.2, lhY: 0.1, lhZ: 0.25 })],
    [1.8, {}],
  ],
  lands: [0.96],
};
