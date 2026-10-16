import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, LOW, TALL, TUCKED } from '../moves/stances';

/*
 * What Selene's body does for her attack and her three skills: an archer's, her bow in her left hand and an arrow in
 * her right. She draws side-on to the boss, her bow arm out at it and her arrow hand drawn back to her cheek. They are
 * written from how she stands (STAND), not from a swordsman's rest. What comes of each is in ../../sim/heroes/selene.ts.
 */

/** How she stands: light on her feet, her bow held low at her left side, her arrow hand by her hip pointing down. */
export const STAND: Pose = {
  ...REST,
  hipX: 0,
  hipY: -0.02,
  hipTurn: -0.1,
  lean: 0.02,
  tilt: 0.03,
  lfX: 0.06,
  lfZ: 0.08,
  rfX: -0.03,
  rfZ: -0.05,
  lhX: 0.2,
  lhY: 0,
  lhZ: 0.12,
  rhX: -0.2,
  rhY: -0.04,
  rhZ: 0.04,
  bTurn: 0,
  bUp: -1.2,
};

/** A pose of hers, for a track: what is added to how she stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Drawn: side-on, her bow arm out straight at the boss, her arrow hand drawn back to her cheek, the arrow pointing at it. */
const DRAWN = { hipTurn: 0.5, twist: 0.35, lhX: 0.05, lhY: 0.38, lhZ: 0.5, rhX: -0.05, rhY: 0.42, rhZ: 0.05, bTurn: 0, bUp: 0.05 };
/** Loosed: her arrow hand flung back open past her ear. */
const LOOSED = { ...DRAWN, rhX: -0.14, rhY: 0.46, rhZ: -0.1 };
/** Drawn, aimed up into the sky. */
const SKYWARD = { ...DRAWN, lhY: 0.65, lhZ: 0.3, rhY: 0.5, rhZ: -0.05, bUp: 0.9 };

// Her attack: her bow raised and drawn, an arrow loosed at the boss, and lowered.
export const ARROW: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...LOW, ...DRAWN })],
    [0.45, as({ ...LOW, ...LOOSED })],
    [0.65, as({ ...LOW, ...LOOSED, rhY: 0.44 })],
    [1, {}],
  ],
};

// Arrow Rain: her bow drawn up at the sky, and arrow after arrow loosed into it to fall on the boss, and lowered.
export const RAIN: Move = {
  keys: [
    [0, {}],
    [0.5, as({ ...COILED, lean: -0.15, nod: -0.25, ...SKYWARD })],
    [0.75, as({ ...LOW, lean: -0.18, nod: -0.28, ...SKYWARD, rhZ: -0.12 })],
    [1.1, as({ ...LOW, lean: -0.18, nod: -0.28, ...SKYWARD })],
    [1.55, as({ ...LOW, lean: -0.18, nod: -0.28, ...SKYWARD, rhZ: -0.12 })],
    [2.1, {}],
  ],
};

// Rush: a leap back, drawn in the air, and five arrows loosed at the boss one after the next, and down.
export const RUSH: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...TUCKED, jump: 0.5, ahead: -0.6, lean: -0.1, ...DRAWN })],
    [0.6, as({ ...TUCKED, jump: 0.6, ahead: -0.8, lean: -0.08, ...LOOSED })],
    [0.95, as({ ...LOW, ahead: -0.8, lean: 0.05, ...LOOSED })],
    [1.3, {}],
  ],
};

// Moonlight Flash: down low, drawn long and slow as the moonlight gathers on the arrow, then loosed in a flash, and back.
export const FLASH: Move = {
  keys: [
    [0, {}],
    [0.5, as({ ...LOW, hipY: -0.16, lean: 0.06, ...DRAWN, rhZ: -0.02 })],
    [0.95, as({ ...LOW, hipY: -0.18, lean: 0.08, ...DRAWN, rhZ: -0.06 })],
    [1.05, as({ ...TALL, lean: -0.08, ...LOOSED, rhZ: -0.2 })],
    [1.35, as({ ...TALL, lean: -0.08, ...LOOSED, rhZ: -0.2 })],
    [1.7, {}],
  ],
};
