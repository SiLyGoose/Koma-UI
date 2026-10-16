import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LUNGE, TALL, TUCKED } from '../moves/stances';

/*
 * What Naila's body does for her attack and her three skills: a winged warrior's, her claws on her hands. They are
 * written from how she stands (STAND), not from a swordsman's rest. What comes of each is in ../../sim/heroes/naila.ts.
 */

/** How she stands: poised on the balls of her feet, her clawed hands out a little from her sides, ready. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.04,
  hipTurn: -0.12,
  lean: 0.06,
  tilt: 0.03,
  lfX: 0.06,
  lfZ: 0.1,
  lfTip: 0.15,
  rfX: -0.04,
  rfZ: -0.06,
  rfTip: 0.15,
  lhX: 0.24,
  lhY: 0.02,
  lhZ: 0.08,
  rhX: -0.24,
  rhY: 0.02,
  rhZ: 0.08,
  bTurn: 0,
  bUp: -0.6,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her right claws drawn back high, to rake. */
const DRAWN = { rhX: -0.3, rhY: 0.42, rhZ: -0.15, bTurn: 2, bUp: 0.8 };
/** Raked down across before her, to her left. */
const RAKED = { rhX: 0.18, rhY: 0.05, rhZ: 0.42, bTurn: 0.6, bUp: -0.4 };

// Her attack: a dart in and a rake of her claws across the boss, and back.
export const TALON: Move = {
  keys: [
    [0, {}],
    [0.18, as({ ...COILED, twist: -0.35, lean: 0.15, ...DRAWN })],
    [0.35, as({ ...LUNGE, ahead: 1.1, twist: 0.45, lean: 0.32, ...RAKED })],
    [0.5, as({ ...LUNGE, ahead: 1.15, hipY: -0.28, twist: 0.48, lean: 0.3, ...RAKED })],
    [0.9, {}],
  ],
};

// Fierce Winds: twice a dash through the boss, low and fast, her claws raking it each time, and back.
export const WINDS: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.3, twist: -0.3, ...DRAWN })],
    [0.45, as({ ...LUNGE, ahead: 3, lean: 0.5, twist: 0.4, ...RAKED })],
    [0.8, as({ ...COILED, ahead: 3.2, lean: 0.3, twist: -0.3, ...DRAWN })],
    [1.05, as({ ...LUNGE, ahead: 3.4, lean: 0.5, twist: 0.4, ...RAKED })],
    [1.6, {}],
  ],
};

// Wind Reading: up tall, both arms swept up and out as the wind rises round every ally, and back.
export const READING: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.12, rhX: -0.15, rhY: 0.1, rhZ: 0.25, lhX: 0.15, lhY: 0.1, lhZ: 0.25 })],
    [0.6, as({ ...TALL, lean: -0.15, nod: -0.25, rhX: -0.45, rhY: 0.6, rhZ: 0.05, lhX: 0.45, lhY: 0.6, lhZ: 0.05, bUp: 1.2 })],
    [0.9, as({ ...TALL, lean: -0.16, nod: -0.26, rhX: -0.46, rhY: 0.62, rhZ: 0.05, lhX: 0.46, lhY: 0.62, lhZ: 0.05, bUp: 1.2 })],
    [1.3, {}],
  ],
};

// Dive Bomb: a leap high into the air over the boss, then down on it claws first, landing low, and back.
export const DIVE: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.2 })],
    [0.65, as({ ...TUCKED, ahead: 1.6, jump: 2.4, lean: -0.1, ...DRAWN, lhX: 0.3, lhY: 0.42, lhZ: -0.15 })],
    [0.85, as({ ...TUCKED, ahead: 2.4, jump: 2, lean: 0.5, ...DRAWN, lhX: 0.3, lhY: 0.42, lhZ: -0.15 })],
    [1, as({ ...KNEELING, ahead: 2.6, lean: 0.45, ...RAKED, lhX: 0.1, lhY: 0.05, lhZ: 0.42 })],
    [1.3, as({ ...KNEELING, ahead: 2.6, lean: 0.4, ...RAKED, lhX: 0.1, lhY: 0.05, lhZ: 0.42 })],
    [1.7, {}],
  ],
};
