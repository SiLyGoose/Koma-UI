import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, TALL, TUCKED } from '../moves/stances';

/*
 * What Oddy's body does for his attack and his three skills: a little red panda's, hovering, his clock on his back
 * (../../assets/heroes/oddy.ts) and what he casts thrown from his right paw. His arms and legs are short, so his paws
 * move little. They are written from how he floats (STAND), not from a swordsman's rest. What comes of each is in
 * ../../sim/heroes/oddy.ts.
 */

/** How he floats: upright, his feet hanging, toes down, his right paw up at his side, his left out a little. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: 0,
  hipTurn: -0.08,
  lean: 0.03,
  tilt: 0.02,
  lfX: 0.03,
  lfY: 0.03,
  lfZ: 0.04,
  rfX: -0.03,
  rfY: 0.02,
  rfZ: -0.03,
  lfTip: 0.5,
  rfTip: 0.5,
  lhX: 0.16,
  lhY: 0.12,
  lhZ: 0.08,
  rhX: -0.16,
  rhY: 0.16,
  rhZ: 0.1,
  bTurn: 0,
  bUp: 1.2,
};

/** A pose of his, for a track: what is added to how he floats. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His right paw thrust out at the boss. */
const HELD_OUT = { rhX: -0.08, rhY: 0.24, rhZ: 0.22, bTurn: 0, bUp: 0.6 };
/** Both paws up high. */
const UP = { rhX: -0.12, rhY: 0.4, rhZ: 0.06, lhX: 0.12, lhY: 0.38, lhZ: 0.06, bUp: 1.5 };

// His attack: a bob up, his paw thrust at the boss (a chime of his clock's light from it), and back.
export const CHIME: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.05, rhX: -0.14, rhY: 0.28, rhZ: -0.02, bUp: 1.4 })],
    [0.42, as({ ...TALL, jump: 0.08, lean: 0.15, ...HELD_OUT })],
    [0.6, as({ lean: 0.1, ...HELD_OUT, rhY: 0.22 })],
    [1, {}],
  ],
};

// Time Fracture: his paw raised, then thrust at the boss (a crack in time runs out to it), and back.
export const FRACTURE: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: -0.08, rhX: -0.12, rhY: 0.38, rhZ: 0.02, bUp: 1.5, lhX: 0.12, lhY: 0.2, lhZ: 0.12 })],
    [0.6, as({ ...TALL, lean: 0.18, ...HELD_OUT, lhX: 0.12, lhY: 0.2, lhZ: 0.18 })],
    [0.9, as({ ...TALL, lean: 0.16, ...HELD_OUT, lhX: 0.12, lhY: 0.2, lhZ: 0.18 })],
    [1.3, {}],
  ],
};

// Time Fragments: shards of time flung from his paw at the boss one after the next, and back.
export const FRAGMENTS: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: 0.05, ...HELD_OUT, lhX: 0.1, lhY: 0.24, lhZ: 0.2 })],
    ...Array.from({ length: 6 }, (_, i): [number, Partial<Pose>] => [0.5 + i * 0.15, as({ lean: 0.1, twist: i % 2 ? 0.15 : -0.15, ...HELD_OUT, rhY: i % 2 ? 0.28 : 0.22, lhX: 0.1, lhY: 0.24, lhZ: 0.2 })]),
    [1.7, {}],
  ],
};

// Time Distortion: a rise with both paws thrown up as time turns about the field, and down.
export const DISTORTION: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: 0.1, rhX: -0.12, rhY: 0.1, rhZ: 0.12, lhX: 0.12, lhY: 0.1, lhZ: 0.12 })],
    [0.7, as({ ...TUCKED, jump: 0.35, lean: -0.2, nod: -0.3, ...UP })],
    [1.1, as({ ...TALL, jump: 0.1, lean: -0.18, nod: -0.28, ...UP })],
    [1.4, as({ ...TALL, lean: -0.15, nod: -0.2, ...UP })],
    [1.8, {}],
  ],
};
