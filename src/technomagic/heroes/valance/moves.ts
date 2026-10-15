import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL } from '../moves/stances';

/*
 * What Valance's body does for her attack and her three skills: a princess's, her technomagic crossbow in her right
 * hand and her left hand free. They are written from how she stands (STAND), not from a swordsman's rest. What
 * comes of each is in ./index.ts.
 */

/**
 * How she stands: upright and poised, her feet together under her gown, her crossbow held low at her right side
 * pointing down and a little ahead, along her forearm (so her wrist is straight), her left hand at her waist.
 */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.01,
  hipTurn: -0.08,
  lean: -0.02,
  tilt: 0.02,
  nod: -0.02,
  lfX: 0.04,
  lfZ: 0.04,
  rfX: -0.03,
  rfZ: -0.02,
  lhX: 0.16,
  lhY: 0.02,
  lhZ: 0.1,
  rhX: -0.21,
  rhY: 0,
  rhZ: 0.2,
  bTurn: 0,
  bUp: -0.95,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her crossbow raised level at the boss, her arm out straight. */
const AIMED = { rhX: -0.12, rhY: 0.3, rhZ: 0.45, bTurn: 0, bUp: 0 };

// Her attack: her crossbow raised at the boss, a bolt loosed with a little kick back, and lowered.
export const BOLT: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...LOW, twist: -0.25, lean: 0.06, ...AIMED })],
    [0.42, as({ ...LOW, twist: -0.27, lean: -0.04, ...AIMED, rhZ: 0.38, bUp: 0.15 })],
    [0.6, as({ ...LOW, twist: -0.26, lean: 0.04, ...AIMED })],
    [1, {}],
  ],
};

// Prototype – VA: her free hand raised toward her ally, palm out, as the hologram forms on it, held, and down.
export const PROTOTYPE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.05, nod: 0.08, lhX: 0.08, lhY: 0.2, lhZ: 0.22 })],
    [0.6, as({ ...TALL, lean: -0.06, nod: -0.1, lhX: 0.3, lhY: 0.45, lhZ: 0.3 })],
    [0.95, as({ ...TALL, lean: -0.07, nod: -0.11, lhX: 0.31, lhY: 0.46, lhZ: 0.3 })],
    [1.3, {}],
  ],
};

// Absolute Protection Field – LA: her crossbow raised high overhead and both arms spread as the field goes up round her, held, and down.
export const FIELD: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, lean: 0.1, nod: 0.12, lhX: 0.1, lhY: 0.15, lhZ: 0.2, rhX: -0.12, rhY: 0.2, rhZ: 0.2, bUp: 0.6 })],
    [0.65, as({ ...TALL, jump: 0.1, lean: -0.12, nod: -0.2, lhX: 0.45, lhY: 0.55, lhZ: 0.05, rhX: -0.14, rhY: 0.85, rhZ: 0.05, bUp: 1.5 })],
    [1.05, as({ ...TALL, jump: 0.12, lean: -0.14, nod: -0.22, lhX: 0.46, lhY: 0.57, lhZ: 0.05, rhX: -0.14, rhY: 0.87, rhZ: 0.05, bUp: 1.52 })],
    [1.45, {}],
  ],
};

/** Ultimate Laser Cannon: the first laser, then nine more, one after the next. */
const FIRST = 0.8;
const EVERY = 0.15;
const LASERS = 9;

// Ultimate Laser Cannon – NCE: her crossbow swept up and her free hand thrown back as the cannons appear behind her, then both aimed at the boss and held while they fire, and back.
export const CANNON: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, twist: 0.3, lean: -0.05, nod: -0.1, lhX: 0.3, lhY: 0.3, lhZ: -0.25, rhX: -0.2, rhY: 0.5, rhZ: -0.05, bUp: 1.2 })],
    [0.75, as({ ...LOW, twist: -0.3, lean: 0.12, lhX: 0.28, lhY: 0.25, lhZ: -0.2, ...AIMED })],
    [FIRST + LASERS * EVERY, as({ ...LOW, hipY: -0.12, twist: -0.32, lean: 0.1, lhX: 0.28, lhY: 0.26, lhZ: -0.2, ...AIMED })],
    [FIRST + LASERS * EVERY + 0.45, {}],
  ],
};
