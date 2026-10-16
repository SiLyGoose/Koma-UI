import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL } from '../moves/stances';

/*
 * What Annette's body does for her attack and her three skills. She holds nothing: Rascal, her golem, hovers
 * beside her (../../assets/heroes/annette.ts puts it there) and does the fighting, so she points it at the boss
 * and cheers it on. They are written from how she stands (STAND), not from a swordsman's rest. What comes of
 * each is in ./index.ts.
 */

/** How she stands: upright and bright, her weight on both feet, her left hand on her hip, her right loose at her side. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.01,
  hipTurn: -0.08,
  lean: 0,
  tilt: 0.03,
  nod: 0.02,
  lfX: 0.05,
  lfZ: 0.06,
  rfX: -0.04,
  rfZ: -0.03,
  lhX: 0.22,
  lhY: 0.02,
  lhZ: -0.02,
  rhX: -0.21,
  rhY: -0.1,
  rhZ: 0.05,
  // Her right hand pointing down, a little ahead.
  bTurn: 0,
  bUp: -1.3,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her right arm thrust out at the boss, her hand pointing at it (Rascal fires where she points). */
const POINT = { rhX: -0.12, rhY: 0.36, rhZ: 0.46, bTurn: 0, bUp: 0.05 };

// Her attack: her right hand drawn up, then flung out at the boss with a little step in (Rascal fires), and back.
export const ZAP: Move = {
  keys: [
    [0, {}],
    [0.2, as({ twist: 0.25, lean: -0.04, rhX: -0.2, rhY: 0.3, rhZ: 0.05, bUp: 1 })],
    [0.42, as({ ...LOW, twist: -0.3, lean: 0.12, ...POINT })],
    [0.6, as({ ...LOW, hipY: -0.11, twist: -0.32, lean: 0.1, ...POINT, rhY: 0.35 })],
    [1, {}],
  ],
};

// Blasting Ray: gathered in, both hands drawn back to her right side; then both thrust out ahead at the boss, held there while Rascal's ray burns into it, and back.
const AIMED = { lhX: 0.06, lhY: 0.32, lhZ: 0.46, rhX: -0.1, rhY: 0.34, rhZ: 0.47, bTurn: 0, bUp: 0.05 };
export const RAY: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, twist: 0.35, lean: 0.05, lhX: -0.02, lhY: 0.12, lhZ: 0.08, rhX: -0.24, rhY: 0.14, rhZ: -0.04, bUp: 0.6 })],
    [0.7, as({ ...LOW, twist: -0.2, lean: 0.18, nod: 0.05, ...AIMED })],
    [1.1, as({ ...LOW, hipY: -0.12, twist: -0.22, lean: 0.16, nod: 0.06, ...AIMED, lhY: 0.33, rhY: 0.35 })],
    [1.5, {}],
  ],
};

// Emergency Treatment: both hands clasped before her chest, then up on her toes with both arms flung up and wide (the treatment goes out to every ally), held, and down.
export const TREATMENT: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.12, nod: 0.12, lhX: 0.06, lhY: 0.32, lhZ: 0.2, rhX: -0.06, rhY: 0.32, rhZ: 0.2, bUp: 1.2 })],
    [0.55, as({ ...TALL, jump: 0.12, lean: -0.12, nod: -0.2, lhX: 0.42, lhY: 0.72, lhZ: 0.08, rhX: -0.42, rhY: 0.72, rhZ: 0.08, bTurn: -0.6, bUp: 1.2 })],
    [0.95, as({ ...TALL, jump: 0.14, lean: -0.14, nod: -0.22, lhX: 0.43, lhY: 0.74, lhZ: 0.08, rhX: -0.43, rhY: 0.74, rhZ: 0.08, bTurn: -0.6, bUp: 1.25 })],
    [1.4, {}],
  ],
};

// Process of Elimination: her right arm wound up high over her head, a hop up, then brought down to point at the boss as she lands (Rascal throws the ball, and it bursts), and back.
export const ELIMINATION: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, twist: 0.35, lean: -0.06, nod: -0.1, lhX: 0.2, lhY: 0.12, lhZ: 0.18, rhX: -0.18, rhY: 0.78, rhZ: -0.06, bUp: 1.5 })],
    [0.65, as({ ...TALL, jump: 0.35, twist: 0.2, lean: -0.1, nod: -0.15, lhX: 0.3, lhY: 0.3, lhZ: 0.1, rhX: -0.16, rhY: 0.82, rhZ: 0.08, bUp: 1.4 })],
    [0.95, as({ ...LOW, twist: -0.35, lean: 0.2, nod: 0.05, lhX: 0.24, lhY: 0.1, lhZ: -0.1, ...POINT })],
    [1.35, as({ ...LOW, hipY: -0.12, twist: -0.36, lean: 0.18, nod: 0.06, lhX: 0.24, lhY: 0.1, lhZ: -0.1, ...POINT })],
    [1.8, {}],
  ],
};
