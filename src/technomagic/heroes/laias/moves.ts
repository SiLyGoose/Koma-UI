import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL } from '../moves/stances';

/*
 * What Laias's body does for her attack and her three skills: a priestess's, her staff held upright in her right
 * hand and her left hand free. They are written from how she stands (STAND), not from a swordsman's rest. What
 * comes of each is in ./index.ts.
 */

/** How she stands: upright and calm, her weight on both feet, her staff upright beside her in her right hand, her left hand loose at her side. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.01,
  hipTurn: -0.05,
  lean: 0,
  tilt: 0.02,
  lfX: 0.05,
  lfZ: 0.05,
  rfX: -0.04,
  rfZ: -0.03,
  lhX: 0.21,
  lhY: -0.12,
  lhZ: 0.03,
  rhX: -0.22,
  rhY: 0.04,
  rhZ: 0.12,
  // Her staff straight up, a little ahead.
  bTurn: 0,
  bUp: 1.45,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her staff held out ahead at the boss, its head tipped toward it. */
const AIMED = { rhX: -0.12, rhY: 0.3, rhZ: 0.42, bTurn: 0, bUp: 0.5 };

// Her attack: her staff drawn back beside her, then swept out at the boss with a step in (a bolt of water), and back.
export const SPLASH: Move = {
  keys: [
    [0, {}],
    [0.22, as({ twist: 0.3, lean: -0.05, rhX: -0.26, rhY: 0.2, rhZ: -0.08, bUp: 1.2 })],
    [0.4, as({ ...LOW, twist: -0.32, lean: 0.14, lhX: 0.24, lhY: -0.04, lhZ: -0.08, ...AIMED })],
    [0.6, as({ ...LOW, hipY: -0.11, twist: -0.34, lean: 0.12, lhX: 0.24, lhY: -0.04, lhZ: -0.08, ...AIMED, rhY: 0.29 })],
    [1, {}],
  ],
  lands: [0.42],
};

// Healing Droplets: her free hand cupped before her chest, then her staff raised high and her free hand opened wide (the droplets fall on every ally), held, and down.
export const DROPLETS: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.12, nod: 0.15, lhX: 0.06, lhY: 0.28, lhZ: 0.2, rhX: -0.14, rhY: 0.2, rhZ: 0.18 })],
    [0.55, as({ ...TALL, lean: -0.12, nod: -0.22, lhX: 0.45, lhY: 0.5, lhZ: 0.08, rhX: -0.16, rhY: 0.78, rhZ: 0.08, bUp: 1.5 })],
    [0.9, as({ ...TALL, lean: -0.14, nod: -0.24, lhX: 0.46, lhY: 0.52, lhZ: 0.08, rhX: -0.16, rhY: 0.8, rhZ: 0.08, bUp: 1.52 })],
    [1.3, {}],
  ],
  lands: [0.6],
};

// Bubble Shield: her free hand held out ahead, palm up, as the bubble forms on it, then pushed out toward her ally, and back.
export const BUBBLE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.1, nod: 0.12, twist: 0.15, lhX: 0.1, lhY: 0.18, lhZ: 0.3 })],
    [0.6, as({ ...LOW, lean: 0.16, nod: 0.05, twist: -0.1, lhX: 0.18, lhY: 0.32, lhZ: 0.5 })],
    [0.9, as({ ...LOW, hipY: -0.11, lean: 0.15, nod: 0.06, twist: -0.12, lhX: 0.18, lhY: 0.33, lhZ: 0.51 })],
    [1.3, {}],
  ],
  lands: [0.62],
};

// Festival of the Flow: gathered low, then up on her toes with her staff thrust high and brought down to the floor before her (the water bursts up under the boss), and back.
export const FESTIVAL: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.15, twist: 0.2, lhX: 0.12, lhY: 0.1, lhZ: 0.2, rhX: -0.16, rhY: 0.14, rhZ: 0.1 })],
    [0.65, as({ ...TALL, jump: 0.2, lean: -0.15, nod: -0.25, lhX: 0.42, lhY: 0.6, lhZ: 0.06, rhX: -0.14, rhY: 0.85, rhZ: 0.1, bUp: 1.55 })],
    [0.95, as({ ...LOW, hipY: -0.16, lean: 0.25, nod: 0.12, twist: -0.2, lhX: 0.3, lhY: 0.05, lhZ: 0.1, rhX: -0.1, rhY: 0.1, rhZ: 0.45, bUp: -0.9 })],
    [1.35, as({ ...LOW, hipY: -0.17, lean: 0.24, nod: 0.12, twist: -0.21, lhX: 0.3, lhY: 0.05, lhZ: 0.1, rhX: -0.1, rhY: 0.1, rhZ: 0.45, bUp: -0.9 })],
    [1.8, {}],
  ],
  lands: [1],
};
