import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, TALL, TUCKED } from '../moves/stances';

/*
 * What Oddy's body does for her attack and her three skills: a little red panda's, her clock in her right paw. Her arms
 * and legs are short, so her paws move little. They are written from how she stands (STAND), not from a swordsman's
 * rest. What comes of each is in ../../sim/heroes/oddy.ts.
 */

/** How she stands: up on her hind legs, her clock held up at her right side, her left paw out a little. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: 0,
  hipTurn: -0.08,
  lean: 0.03,
  tilt: 0.02,
  lfX: 0.03,
  lfZ: 0.04,
  rfX: -0.03,
  rfZ: -0.03,
  lhX: 0.16,
  lhY: 0.12,
  lhZ: 0.08,
  rhX: -0.16,
  rhY: 0.16,
  rhZ: 0.1,
  bTurn: 0,
  bUp: 1.2,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her clock held out at the boss. */
const HELD_OUT = { rhX: -0.08, rhY: 0.24, rhZ: 0.22, bTurn: 0, bUp: 0.6 };
/** Both paws up high. */
const UP = { rhX: -0.12, rhY: 0.4, rhZ: 0.06, lhX: 0.12, lhY: 0.38, lhZ: 0.06, bUp: 1.5 };

// Her attack: a hop, her clock thrust at the boss (it chimes), and back.
export const CHIME: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, lean: 0.05, rhX: -0.14, rhY: 0.28, rhZ: -0.02, bUp: 1.4 })],
    [0.42, as({ ...TALL, jump: 0.08, lean: 0.15, ...HELD_OUT })],
    [0.6, as({ lean: 0.1, ...HELD_OUT, rhY: 0.22 })],
    [1, {}],
  ],
};

// Time Fracture: her clock raised, then thrust at the boss (a crack in time runs out to it), and back.
export const FRACTURE: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: -0.08, rhX: -0.12, rhY: 0.38, rhZ: 0.02, bUp: 1.5, lhX: 0.12, lhY: 0.2, lhZ: 0.12 })],
    [0.6, as({ ...TALL, lean: 0.18, ...HELD_OUT, lhX: 0.12, lhY: 0.2, lhZ: 0.18 })],
    [0.9, as({ ...TALL, lean: 0.16, ...HELD_OUT, lhX: 0.12, lhY: 0.2, lhZ: 0.18 })],
    [1.3, {}],
  ],
};

// Time Fragments: her clock spun round before her, shards of it flung at the boss one after the next, and back.
export const FRAGMENTS: Move = {
  keys: [
    [0, {}],
    [0.35, as({ ...COILED, lean: 0.05, ...HELD_OUT, lhX: 0.1, lhY: 0.24, lhZ: 0.2 })],
    ...Array.from({ length: 6 }, (_, i): [number, Partial<Pose>] => [0.5 + i * 0.15, as({ lean: 0.1, twist: i % 2 ? 0.15 : -0.15, ...HELD_OUT, rhY: i % 2 ? 0.28 : 0.22, lhX: 0.1, lhY: 0.24, lhZ: 0.2 })]),
    [1.7, {}],
  ],
};

// Time Distortion: a leap with both paws thrown up, her clock high over her as time turns about the field, and down.
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
