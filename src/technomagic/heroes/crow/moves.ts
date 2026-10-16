import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LOW } from '../moves/stances';

/*
 * What Crow's body does for his attack and his three skills: a gunman's, his great gun in his right hand, his left
 * free to steady it. They are written from how he stands (STAND), not from a swordsman's rest. What comes of each is
 * in ../../sim/heroes/crow.ts.
 */

/** How he stands: straight and still, his gun hanging at his right side along his leg, its muzzle to the floor ahead, his left hand loose. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.01,
  hipTurn: -0.08,
  lean: 0,
  tilt: 0.02,
  lfX: 0.05,
  lfZ: 0.06,
  rfX: -0.04,
  rfZ: -0.04,
  lhX: 0.22,
  lhY: -0.08,
  lhZ: 0.02,
  rhX: -0.24,
  rhY: -0.02,
  rhZ: 0.1,
  bTurn: 0,
  bUp: -0.9,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His gun raised level at the boss, at his hip, his left hand under it. */
const AIMED = { rhX: -0.14, rhY: 0.2, rhZ: 0.3, lhX: -0.02, lhY: 0.18, lhZ: 0.42, bTurn: 0, bUp: 0 };
/** Its kick. */
const KICKED = { ...AIMED, rhZ: 0.24, bUp: 0.12 };

// His attack: his gun raised at the boss, a shot with a kick, and lowered.
export const SNIPE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...LOW, twist: -0.2, ...AIMED })],
    [0.42, as({ ...LOW, twist: -0.2, lean: -0.05, ...KICKED })],
    [0.6, as({ ...LOW, twist: -0.2, ...AIMED })],
    [1, {}],
  ],
};

// Target will be Eliminated.: his gun raised and held on the boss, shot after shot, each with a kick, and lowered.
export const ELIMINATE: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...LOW, twist: -0.22, lean: 0.05, ...AIMED })],
    ...Array.from({ length: 8 }, (_, i): [number, Partial<Pose>] => [0.45 + i * 0.14, as({ ...LOW, twist: -0.22, lean: i % 2 ? 0.05 : -0.02, ...(i % 2 ? AIMED : KICKED) })]),
    [1.9, {}],
  ],
};

// Struggle is Meaningless.: shot after shot from the hip, then down on one knee for the Frost Bullet, aimed long and loosed, and up.
export const STRUGGLE: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...LOW, twist: -0.22, ...AIMED })],
    [0.6, as({ ...LOW, twist: -0.22, lean: -0.03, ...KICKED })],
    [0.95, as({ ...LOW, twist: -0.22, ...AIMED })],
    [1.25, as({ ...KNEELING, lean: 0.1, twist: -0.25, ...AIMED, rhY: 0.28 })],
    [1.4, as({ ...KNEELING, lean: 0.02, twist: -0.25, ...KICKED, rhY: 0.28 })],
    [1.6, as({ ...KNEELING, lean: 0.06, twist: -0.25, ...AIMED, rhY: 0.28 })],
    [2, {}],
  ],
};

// Even Gods shall Die.: down low and braced, his gun shouldered and held still on the boss as he focuses, then the laser, a great kick, and up.
export const GODS: Move = {
  keys: [
    [0, {}],
    [0.4, as({ ...COILED, hipY: -0.25, lean: 0.15, twist: -0.3, ...AIMED, rhY: 0.35, lhY: 0.32 })],
    [1.6, as({ ...COILED, hipY: -0.27, lean: 0.17, twist: -0.32, ...AIMED, rhY: 0.35, lhY: 0.32 })],
    [1.75, as({ ...COILED, hipY: -0.22, ahead: -0.25, lean: -0.08, twist: -0.32, ...KICKED, rhY: 0.38, lhY: 0.34, bUp: 0.25 })],
    [2, as({ ...COILED, hipY: -0.22, ahead: -0.25, lean: 0, twist: -0.3, ...AIMED, rhY: 0.35, lhY: 0.32 })],
    [2.4, {}],
  ],
};
