import { at, REST, type Pose } from '../body/pose';
import type { Move } from '../moves/move';
import { COILED, KNEELING, LOW, LUNGE, TALL, TUCKED } from '../moves/stances';

/*
 * What Ezekiel's body does for his attack and his three skills. He holds nothing: his right arm is Barbatos, his
 * demon arm, and he fights with its claws (where its hand points is where they reach). They are written from how
 * he stands (STAND), not from a swordsman's rest. What comes of each is in ./index.ts.
 */

/** How he stands: low and loose, his weight back, his demon arm hanging heavy at his right side with its claws pointing down, his left hand at his hip. */
export const STAND: Pose = {
  ...REST,
  hipX: -0.03,
  hipY: -0.04,
  hipTurn: -0.15,
  lean: 0.08,
  tilt: 0.04,
  nod: 0.04,
  lfX: 0.07,
  lfZ: 0.08,
  rfX: -0.03,
  rfZ: -0.05,
  lhX: 0.2,
  lhY: -0.04,
  lhZ: -0.04,
  rhX: -0.25,
  rhY: -0.12,
  rhZ: 0.08,
  bTurn: 0,
  bUp: -1.2,
};

/** A pose of his, for a track: what is added to how he stands. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** His demon arm drawn back and up behind him, its claws raised, to swipe. */
const DRAWN = { rhX: -0.3, rhY: 0.4, rhZ: -0.2, bTurn: 2.2, bUp: 0.8 };
/** Swept through, across in front of him to his left, its claws out ahead. */
const SWEPT = { rhX: 0.2, rhY: 0.2, rhZ: 0.4, bTurn: 0.8, bUp: -0.1 };

// His attack: his demon arm drawn back, then a swipe across the boss with a step in, and back.
export const CLAW: Move = {
  keys: [
    [0, {}],
    [0.2, as({ ...COILED, twist: -0.4, lean: 0.12, ...DRAWN })],
    [0.38, as({ ...LUNGE, ahead: 1.2, twist: 0.45, lean: 0.3, ...SWEPT })],
    [0.55, as({ ...LUNGE, ahead: 1.25, hipY: -0.28, twist: 0.5, lean: 0.28, ...SWEPT, rhX: 0.22 })],
    [1, {}],
  ],
  lands: [0.4],
};

// Destructive Instinct: a great swipe round in a circle, then up into the air and his claws driven down into the ground (the boss is knocked down), and back.
export const INSTINCT: Move = {
  keys: [
    [0, {}],
    [0.25, as({ ...COILED, twist: -0.6, lean: 0.15, ...DRAWN })],
    [0.45, as({ ...LUNGE, ahead: 1.5, twist: 0.7, lean: 0.32, ...SWEPT })],
    [0.6, as({ ...LUNGE, ahead: 1.6, twist: 0.75, lean: 0.3, ...SWEPT, rhX: 0.26 })],
    [0.85, as({ ...TUCKED, ahead: 1.8, jump: 1.2, lean: -0.15, rhX: -0.2, rhY: 0.85, rhZ: 0, bTurn: 0, bUp: 1.4 })],
    [1.05, as({ ...KNEELING, ahead: 2, lean: 0.5, rhX: -0.08, rhY: -0.3, rhZ: 0.42, bTurn: 0, bUp: -1.3 })],
    [1.4, as({ ...KNEELING, ahead: 2, hipY: -0.4, lean: 0.46, rhX: -0.08, rhY: -0.3, rhZ: 0.4, bTurn: 0, bUp: -1.3 })],
    [1.85, {}],
  ],
  lands: [0.47, 1.07],
};

// Dawning Despair: low, then a dash far in at the boss with his claws thrust ahead, a swipe as he arrives, and back.
export const DESPAIR: Move = {
  keys: [
    [0, {}],
    [0.2, as({ ...COILED, lean: 0.3, twist: -0.3, ...DRAWN })],
    [0.42, as({ ...LUNGE, ahead: 3.4, lean: 0.5, twist: 0.2, rhX: -0.1, rhY: 0.3, rhZ: 0.52, bTurn: 0, bUp: 0 })],
    [0.55, as({ ...LUNGE, ahead: 3.6, lean: 0.42, twist: 0.6, ...SWEPT })],
    [0.75, as({ ...LOW, ahead: 3.5, lean: 0.25, twist: 0.5, ...SWEPT })],
    [1.3, {}],
  ],
  lands: [0.56],
};

// Strike of Doom: drawn up tall, his demon arm raised high and held as it charges, then brought down on the boss in a lunge, and back.
export const DOOM: Move = {
  keys: [
    [0, {}],
    [0.3, as({ ...TALL, lean: -0.15, nod: -0.15, twist: -0.3, rhX: -0.18, rhY: 0.85, rhZ: -0.05, bTurn: 0, bUp: 1.5 })],
    [0.8, as({ ...TALL, lean: -0.17, nod: -0.17, twist: -0.32, rhX: -0.18, rhY: 0.88, rhZ: -0.05, bTurn: 0, bUp: 1.52 })],
    [1, as({ ...LUNGE, ahead: 1.6, lean: 0.48, twist: 0.2, rhX: -0.06, rhY: 0.05, rhZ: 0.5, bTurn: 0, bUp: -0.9 })],
    [1.3, as({ ...LUNGE, ahead: 1.6, hipY: -0.3, lean: 0.45, twist: 0.22, rhX: -0.06, rhY: 0.05, rhZ: 0.48, bTurn: 0, bUp: -0.9 })],
    [1.75, {}],
  ],
  lands: [1.02],
};
