import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL } from '../moves/stances';

/*
 * What Yanne's body does for her attack and her three skills: an archer's, her great bow in her left hand and an arrow
 * in her right, drawn side-on to the boss as Selene draws. They are written from how she stands (STAND). What comes of
 * each is in ../../sim/heroes/yanne.ts.
 */

/** How she stands: her weight back, her great bow held low at her left side, her arrow hand by her hip. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.02,
  hipTurn: -0.12,
  lean: 0.01,
  tilt: 0.03,
  lfX: 0.07,
  lfZ: 0.1,
  rfX: -0.04,
  rfZ: -0.06,
  lhX: 0.21,
  lhY: 0.02,
  lhZ: 0.12,
  rhX: -0.2,
  rhY: -0.04,
  rhZ: 0.04,
  bTurn: 0,
  bUp: -1.2,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Drawn: side-on, her bow arm out at the boss, her arrow hand drawn back to her cheek. */
const DRAWN = { hipTurn: 0.5, twist: 0.35, lhX: 0.05, lhY: 0.38, lhZ: 0.5, rhX: -0.05, rhY: 0.42, rhZ: 0.05, bTurn: 0, bUp: 0.05 };
/** Overdrawn: her arrow hand drawn further back, past her ear. */
const OVERDRAWN = { ...DRAWN, rhX: -0.09, rhY: 0.44, rhZ: -0.06 };
/** Loosed: her arrow hand flung back open. */
const LOOSED = { ...DRAWN, rhX: -0.16, rhY: 0.47, rhZ: -0.14 };

// Her attack: her bow raised and drawn, an arrow loosed, and lowered.
export const SHOT: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...LOW, ...DRAWN })],
    [0.45, as({ ...LOW, ...LOOSED })],
    [0.65, as({ ...LOW, ...LOOSED, rhY: 0.45 })],
    [1, {}],
  ],
};

// Focus Shot!: drawn and held, focusing, further and further back; loosed, and lowered.
export const FOCUS: Move = {
  keys: [
    [0, {}],
    [0.4, as({ ...COILED, ...DRAWN })],
    [1.2, as({ ...COILED, hipY: -0.24, lean: 0.05, ...OVERDRAWN })],
    [1.3, as({ ...LOW, lean: -0.08, ...LOOSED })],
    [1.55, as({ ...LOW, lean: -0.04, ...LOOSED })],
    [1.9, {}],
  ],
};

// Wipeout!: a great arrow drawn hard and loosed, her weight thrown back with it, and lowered.
export const WIPEOUT: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, ...OVERDRAWN })],
    [0.6, as({ ...LOW, lean: -0.15, ...LOOSED })],
    [0.85, as({ ...LOW, lean: -0.1, ...LOOSED })],
    [1.3, {}],
  ],
};

// No Holding Back!: her bow thrust up overhead as her power rises, and brought down ready.
export const UNLEASH: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...TALL, lean: -0.15, nod: -0.25, lhX: 0.12, lhY: 0.62, lhZ: 0.1, rhX: -0.25, rhY: 0.1, rhZ: 0.05 })],
    [0.7, as({ ...TALL, lean: -0.18, nod: -0.3, lhX: 0.12, lhY: 0.66, lhZ: 0.08, rhX: -0.28, rhY: 0.12, rhZ: 0.02 })],
    [1, as({ ...LOW, ...DRAWN })],
    [1.4, {}],
  ],
};
