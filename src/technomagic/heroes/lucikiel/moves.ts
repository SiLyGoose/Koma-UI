import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, LUNGE, TALL } from '../moves/stances';

/*
 * What Lucikiel's body does for his attack and his skills. He holds nothing: the demon god's claws float by his
 * shoulders, and he fights with his own bare hands, the power of destruction in them. They are written from how he
 * stands (STAND), not from a swordsman's rest. What comes of each is in ../../sim/heroes/lucikiel.ts.
 */

/** How he stands: tall and at his ease, his weight back, his hands hanging open at his sides. */
export const STAND: Pose = {
  ...REST,
  hipX: -0.02,
  hipY: -0.01,
  hipTurn: -0.1,
  lean: -0.03,
  tilt: 0.03,
  nod: 0.05,
  lfX: 0.07,
  lfZ: 0.07,
  rfX: -0.04,
  rfZ: -0.04,
  lhX: 0.24,
  lhY: -0.06,
  lhZ: 0,
  rhX: -0.24,
  rhY: -0.06,
  rhZ: 0.02,
  bTurn: 0,
  bUp: -1.3,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His right hand thrust out open at the boss. */
const THRUST = { rhX: -0.1, rhY: 0.32, rhZ: 0.48, bTurn: 0, bUp: 0.1 };
/** Both hands thrust out together at the boss. */
const BOTH = { ...THRUST, lhX: 0.1, lhY: 0.3, lhZ: 0.46 };

// His attack: his right hand drawn back, then thrust open at the boss (a burst of darkness on it), and back.
export const HAVOC: Move = {
  keys: [
    [0, {}],
    [0.25, as({ twist: 0.35, lean: -0.04, rhX: -0.28, rhY: 0.25, rhZ: -0.15, bUp: 0.6 })],
    [0.42, as({ ...LOW, twist: -0.35, lean: 0.14, ...THRUST })],
    [0.6, as({ ...LOW, twist: -0.36, lean: 0.12, ...THRUST, rhY: 0.3 })],
    [1.05, {}],
  ],
};

// Death Storm: his right hand raised and swept round three times, a storm turning over the boss, and down.
export const STORM: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...COILED, twist: 0.3, rhX: -0.2, rhY: 0.6, rhZ: 0.1, bUp: 1.2, lhX: 0.2, lhY: 0.05, lhZ: 0.15 })],
    [0.5, as({ ...LOW, twist: -0.3, lean: 0.1, rhX: 0.05, rhY: 0.5, rhZ: 0.4, bUp: 0.5, lhX: 0.2, lhY: 0.05, lhZ: 0.15 })],
    [0.75, as({ ...LOW, twist: 0.25, lean: 0.08, rhX: -0.3, rhY: 0.55, rhZ: 0.2, bUp: 0.8, lhX: 0.2, lhY: 0.05, lhZ: 0.15 })],
    [1, as({ ...LOW, twist: -0.35, lean: 0.12, ...THRUST, lhX: 0.2, lhY: 0.05, lhZ: 0.15 })],
    [1.5, {}],
  ],
};

/** A wave: both hands drawn back to his right, then swept out across at the boss twice. */
const waved = (first: number, second: number, end: number, wide: number): Move => ({
  keys: [
    [0, {}],
    [first - 0.25, as({ ...COILED, twist: 0.45, lean: 0.05, rhX: -0.32, rhY: 0.2, rhZ: -0.1, lhX: -0.05, lhY: 0.2, lhZ: 0.1, bUp: 0.3 })],
    [first, as({ ...LUNGE, ahead: 0.3, twist: -0.4 * wide, lean: 0.25, ...BOTH })],
    [second - 0.2, as({ ...LOW, twist: 0.3, lean: 0.1, rhX: -0.3, rhY: 0.25, rhZ: 0.1, lhX: 0.3, lhY: 0.25, lhZ: 0.1, bUp: 0.3 })],
    [second, as({ ...LUNGE, ahead: 0.35, twist: -0.45 * wide, lean: 0.28, ...BOTH, rhY: 0.24, lhY: 0.22 })],
    [end, {}],
  ],
});

// Annihilation Wave, and the wider Surge: each a wave of darkness swept out at the boss, then another that draws it in.
export const WAVE: Move = waved(0.5, 0.95, 1.5, 1);
export const SURGE: Move = waved(0.55, 1.05, 1.65, 1.3);

// Doomsday: up tall with both hands raised, the darkness gathering overhead and crashing down on the boss nine times, the last driven down hard, and back.
export const DOOMSDAY: Move = {
  keys: [
    [0, {}],
    [0.5, as({ ...TALL, lean: -0.2, nod: -0.35, rhX: -0.2, rhY: 0.85, rhZ: 0.05, lhX: 0.2, lhY: 0.85, lhZ: 0.05, bUp: 1.5 })],
    [1.3, as({ ...TALL, lean: -0.22, nod: -0.36, rhX: -0.22, rhY: 0.88, rhZ: 0.06, lhX: 0.22, lhY: 0.88, lhZ: 0.06, bUp: 1.5 })],
    [1.85, as({ ...LOW, hipY: -0.2, lean: 0.3, nod: 0.1, ...BOTH, rhY: 0.05, lhY: 0.05 })],
    [2.1, as({ ...LOW, hipY: -0.21, lean: 0.28, nod: 0.08, ...BOTH, rhY: 0.05, lhY: 0.05 })],
    [2.5, {}],
  ],
};
