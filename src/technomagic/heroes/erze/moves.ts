import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL, WIDE } from '../moves/stances';

/*
 * What Erze's body does for her attack and her three skills: a vampire's, the bat-winged orb of blood floating by her
 * right hand (on her skeleton, as her weapon's file has it). They are written from how she stands (STAND). What comes
 * of each is in ../../sim/heroes/erze.ts.
 */

/** How she stands: idly, her weight on one hip, her right hand raised a little with her orb by it. */
export const STAND: Pose = {
  ...REST,
  hipX: -0.05,
  hipY: -0.02,
  hipTurn: -0.15,
  lean: 0,
  tilt: 0.07,
  lfX: 0.08,
  lfZ: 0.05,
  rfX: -0.01,
  rfZ: -0.02,
  lhX: 0.18,
  lhY: 0.05,
  lhZ: 0.1,
  rhX: -0.24,
  rhY: 0.18,
  rhZ: 0.12,
  bTurn: 0,
  bUp: -1.2,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her right hand flung out at the boss, her orb with it. */
const FLUNG = { hipTurn: -0.2, twist: -0.25, rhX: -0.1, rhY: 0.3, rhZ: 0.5 };
/** Both hands raised high over her head. */
const RAISED = { lhX: 0.15, lhY: 0.62, lhZ: 0.05, rhX: -0.15, rhY: 0.62, rhZ: 0.05 };

// Her attack: her hand flung out, blood loosed at the boss, and back.
export const DRAIN: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, hipTurn: 0.15, rhX: -0.25, rhY: 0.35, rhZ: -0.05 })],
    [0.42, as({ ...LOW, ...FLUNG })],
    [0.6, as({ ...LOW, ...FLUNG })],
    [1, {}],
  ],
};

// Sweet Blood: a dash in and her hand raked across the boss, and back.
export const SWEET: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, hipTurn: 0.2, rhX: -0.3, rhY: 0.35, rhZ: -0.05 })],
    [0.5, as({ ...LOW, ahead: 1.2, lean: 0.25, ...FLUNG })],
    [0.75, as({ ...LOW, ahead: 1.2, lean: 0.2, ...FLUNG })],
    [1.2, {}],
  ],
};

// Soaking Blood: wrapped in her arms as the blood closes round her, and back.
export const SOAK: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: 0.2, nod: 0.2, lhX: -0.08, lhY: 0.3, lhZ: 0.12, rhX: 0.08, rhY: 0.3, rhZ: 0.12 })],
    [0.6, as({ ...TALL, lean: -0.1, nod: -0.15, lhX: 0.4, lhY: 0.35, lhZ: 0.05, rhX: -0.4, rhY: 0.35, rhZ: 0.05 })],
    [0.95, as({ ...TALL, lean: -0.08, lhX: 0.4, lhY: 0.33, lhZ: 0.05, rhX: -0.4, rhY: 0.33, rhZ: 0.05 })],
    [1.3, {}],
  ],
};

// Blood Liberation: both hands raised as the blood rises, then flung wide, and back.
export const LIBERATION: Move = {
  keys: [
    [0, {}],
    [0.4, as({ ...TALL, lean: -0.15, nod: -0.25, ...RAISED })],
    [0.7, as({ ...WIDE, lean: 0.1, lhX: 0.45, lhY: 0.3, lhZ: 0.2, rhX: -0.45, rhY: 0.3, rhZ: 0.2 })],
    [1, as({ ...WIDE, lean: 0.08, lhX: 0.45, lhY: 0.28, lhZ: 0.2, rhX: -0.45, rhY: 0.28, rhZ: 0.2 })],
    [1.4, {}],
  ],
};
