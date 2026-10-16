import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, LUNGE, TUCKED, WIDE } from '../moves/stances';

/*
 * What Tanya's body does for her attack and her three skills: an assassin's, a katar on each fist. They are written from
 * how she stands (STAND). What comes of each is in ../../sim/heroes/tanya.ts.
 */

/** How she stands: low and ready, her katars held before her. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.08,
  hipTurn: -0.15,
  lean: 0.12,
  tilt: 0.02,
  lfX: 0.07,
  lfZ: 0.14,
  rfX: -0.05,
  rfZ: -0.1,
  lhX: 0.14,
  lhY: 0.2,
  lhZ: 0.22,
  rhX: -0.16,
  rhY: 0.14,
  rhZ: 0.16,
  bTurn: 0,
  bUp: 0,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Each katar driven out at the boss. */
const LEFT_OUT = { hipTurn: -0.25, twist: -0.3, lhX: 0.02, lhY: 0.25, lhZ: 0.55 };
const RIGHT_OUT = { hipTurn: 0.25, twist: 0.3, rhX: -0.02, rhY: 0.25, rhZ: 0.55 };

// Her attack: her left katar, then her right, driven into the boss, and back.
export const KATAR: Move = {
  keys: [
    [0, {}],
    [0.2, as({ ...COILED, lean: 0.2 })],
    [0.3, as({ ...LUNGE, ahead: 0.6, lean: 0.3, ...LEFT_OUT })],
    [0.55, as({ ...LUNGE, ahead: 0.7, lean: 0.3, ...RIGHT_OUT })],
    [1, {}],
  ],
};

// Target Sighted: a leap behind the boss and a stab down into it, and back.
export const SIGHTED: Move = {
  keys: [
    [0, {}],
    [0.2, as({ ...COILED, lean: 0.3 })],
    [0.4, as({ ...TUCKED, ahead: 2.6, jump: 0.8, lean: 0.4, lhY: 0.5, rhY: 0.5 })],
    [0.5, as({ ...LUNGE, ahead: 3, lean: 0.45, ...LEFT_OUT, ...RIGHT_OUT, lhY: 0.05, rhY: 0.05 })],
    [0.8, as({ ...LOW, ahead: 3, lean: 0.3 })],
    [1.2, {}],
  ],
};

// Blade Tornado: spun round where she stands, both katars out, three times, and back.
export const TORNADO: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...WIDE, lhX: 0.45, lhY: 0.25, lhZ: 0.1, rhX: -0.45, rhY: 0.25, rhZ: 0.1 })],
    [0.4, as({ ...WIDE, spin: Math.PI * 2, lhX: 0.45, lhY: 0.25, lhZ: 0.1, rhX: -0.45, rhY: 0.25, rhZ: 0.1 })],
    [0.6, as({ ...WIDE, spin: Math.PI * 4, lhX: 0.45, lhY: 0.25, lhZ: 0.1, rhX: -0.45, rhY: 0.25, rhZ: 0.1 })],
    [0.8, as({ ...WIDE, spin: Math.PI * 6, lhX: 0.45, lhY: 0.25, lhZ: 0.1, rhX: -0.45, rhY: 0.25, rhZ: 0.1 })],
    [1.3, { spin: Math.PI * 6 }],
  ],
};

// Whisper of Death: darting in and out of the boss, a stab each time, the last driven home, and back.
export const WHISPER: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.3 })],
    [0.4, as({ ...LUNGE, ahead: 1.5, lean: 0.4, ...LEFT_OUT })],
    [0.52, as({ ...LUNGE, ahead: 1.3, lean: 0.35, ...RIGHT_OUT })],
    [0.64, as({ ...LUNGE, ahead: 1.6, lean: 0.4, ...LEFT_OUT })],
    [0.76, as({ ...LUNGE, ahead: 1.3, lean: 0.35, ...RIGHT_OUT })],
    [0.88, as({ ...LUNGE, ahead: 1.6, lean: 0.4, ...LEFT_OUT })],
    [1, as({ ...LUNGE, ahead: 1.3, lean: 0.35, ...RIGHT_OUT })],
    [1.15, as({ ...COILED, ahead: 1.2, lean: 0.2, lhY: 0.5, rhY: 0.5 })],
    [1.3, as({ ...LUNGE, ahead: 1.8, lean: 0.5, ...LEFT_OUT, ...RIGHT_OUT })],
    [1.9, {}],
  ],
};
