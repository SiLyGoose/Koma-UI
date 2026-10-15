import { ASLEEP } from '../../sim/heroes/gremory';
import { at, REST, type Bends, type Pose } from '../body/pose';
import type { Move } from '../moves/move';

/*
 * What Gremory's body does for her attack and her skills. She never stands: she lies on her side along the top of
 * her cube, which floats under her (../../assets/heroes/gremory.ts puts it there), her head propped on her hand,
 * as lazy as she is in the game, and her servants come out of it to do the work. So every move is her left arm
 * and her head alone: the rest of her stays lying where she is, her head on her right hand.
 *
 * Each pose here is in her model's own axes, as she would be standing up; she is then rolled onto her right side
 * (STAND's roll) and turned back onto the cube (its flip). So for her, lying: her model's left (X) is up, off the
 * cube, and its right (-X) down, into it; its up (Y) is behind her, away from the boss (a little up, her head end
 * raised), and its down (-Y) toward the boss; and ahead of her (Z) is out over the cube's near side, toward the
 * camera. What comes of each move is in ./index.ts.
 */

/** How far back she is turned, lying, her head end a little up; and rolled onto her right side. */
const LIE = -Math.PI / 2 + 0.3;
const SIDE = -Math.PI / 2;

/**
 * How she lies: on her right side along the top of the cube, her head at its back, propped on her right hand, its
 * elbow bent under her on the cube; her left hand hung on her left leg, which is bent, its knee out ahead of her and
 * its foot on the cube; her right leg along it, the back of its knee on its front edge, its shin hanging down off it.
 */
export const STAND: Pose = {
  ...REST,
  flip: LIE,
  roll: SIDE,
  hipX: 0.185,
  hipY: 0.078,
  hipZ: 0,
  hipTurn: 0,
  lean: 0,
  twist: 0,
  tilt: 0,
  nod: 0,
  look: 0,
  lfX: 0.119,
  lfY: 0.479,
  lfZ: 0.084,
  lfTip: 0,
  rfX: 0.037,
  rfY: 0.252,
  rfZ: 0.024,
  rfTip: 0.5,
  lhX: 0.131,
  lhY: -0.085,
  lhZ: 0.08,
  rhX: 0.035,
  rhY: 0.429,
  rhZ: 0.07,
  bTurn: 0,
  bUp: 0,
};

/** Lying so, her right elbow bends down under her, onto the cube; her left knee out ahead of her and down onto it; and her right knee over its edge, its shin hanging. */
export const BENDS: Bends = { lKnee: [-0.14, -0.34, 0.93], rKnee: [0.88, -0.47, 0], rElbow: [-0.92, -0.28, 0.29] };

/** A pose of hers, for a track: what is added to how she lies. */
const as = (pose: Partial<Pose>): Partial<Pose> => at(pose, STAND);

/** Her attack: how far her cube tips up (15°) as it lands, how far apart its pieces are then, and how far ahead and up it has swept her (as the field measures it). */
const UPPERCUT = { rock: Math.PI / 12, spread: 0.35, ahead: 2.4, jump: 0.4 };

/** Her left hand out at the boss, her arm straight; and further, jabbing. */
const OUT = { lhX: 0.29, lhY: 0.02, lhZ: 0.12 };
const JAB = { lhX: 0.35, lhY: -0.04, lhZ: 0.12 };

// Her attack: her cube swept forward and up under her like an uppercut, its pieces flying apart as if they wanted
// room from each other: drawn back a little, its front dipping, then swung ahead in an arc, tipping up with her on
// it; it stops 15° up (the blow lands), held a moment, and glides her back to where she was, settling back together.
// Her left hand flung off her leg and out at the boss.
export const NUDGE: Move = {
  keys: [
    [0, {}],
    [0.21, { ahead: -0.15, rock: -0.04, spread: 0.06 }],
    [0.39, { ahead: 1.3, jump: 0.5, rock: UPPERCUT.rock * 0.6, spread: 0.22, ...as({ lhX: 0.2, lhY: 0.2, lhZ: 0.15 }) }],
    [0.54, { ...UPPERCUT, ...as(JAB) }],
    [0.78, { ...UPPERCUT, ...as(JAB), ahead: UPPERCUT.ahead + 0.12, spread: UPPERCUT.spread + 0.03 }],
    [1.17, { ahead: 0.6, jump: 0.12, rock: 0.025, spread: 0.05 }],
    [1.43, {}],
  ],
};

/** Pochi, bite them!: five bites. */
const BITES = 5;
const BITE = { first: 0.5, every: 0.2 };

// Pochi, bite them!: her head up to watch, her left hand drawn up, then thrust out at the boss and held there, jabbing with each bite, and back.
export const POCHI: Move = {
  keys: [
    [0, {}],
    [0.25, as({ nod: 0.2, lhX: 0.2, lhY: 0.2, lhZ: 0.15 })],
    [0.45, as({ nod: 0.25, ...OUT })],
    ...Array.from({ length: BITES }, (_, i): [number, Partial<Pose>] => [BITE.first + 0.1 + i * BITE.every, as({ nod: 0.25, ...JAB })]),
    [BITE.first + BITES * BITE.every + 0.1, as({ nod: 0.25, ...OUT })],
    [BITE.first + BITES * BITE.every + 0.45, {}],
  ],
};

// Puchi, knock them away!: her left arm thrown up high over her, then swept down ahead at the boss (Puchi comes down on it from behind), and back.
export const PUCHI: Move = {
  keys: [
    [0, {}],
    [0.4, as({ nod: 0.1, lhX: 0.54, lhY: 0.46, lhZ: 0 })],
    [0.75, as({ nod: 0.3, lhX: 0.19, lhY: -0.09, lhZ: 0.15 })],
    [0.95, as({ nod: 0.3, lhX: 0.2, lhY: -0.08, lhZ: 0.15 })],
    [1.4, {}],
  ],
};

/** Pippi, wrap them!: ten blows. */
const WRAPS = 10;
const WRAP = { first: 0.6, every: 0.15 };

// Pippi, wrap them!: her left arm raised high over her and waved back and forth while Pippi wraps the boss again and again, and down.
const RAISED = { nod: 0.15, lhX: 0.54, lhY: 0.27, lhZ: -0.12 };
const WAVED = { nod: 0.15, lhX: 0.5, lhY: 0.34, lhZ: 0.12 };
export const PIPPI: Move = {
  keys: [
    [0, {}],
    [0.3, as({ nod: 0.1, lhX: 0.2, lhY: 0.2, lhZ: 0.15 })],
    [0.55, as(RAISED)],
    ...Array.from({ length: WRAPS / 2 }, (_, i): [number, Partial<Pose>] => [WRAP.first + (i * 2 + 1) * WRAP.every, as(i % 2 === 0 ? WAVED : RAISED)]),
    [WRAP.first + WRAPS * WRAP.every, as(RAISED)],
    [WRAP.first + WRAPS * WRAP.every + 0.5, {}],
  ],
};

// Eh, whatever. I'm gonna sleep.: a stretch, her left arm up over her head; then her head laid down on her right
// arm (her head end lowered, that arm laid flat on the cube out ahead of her), her left hand back on her leg,
// asleep, her head turned a little down; and up again.
const DOZING = { flip: STAND.flip - 0.12, nod: -0.1, rhX: -0.11, rhY: 0.39, rhZ: 0.34, lhX: 0.13, lhY: -0.12, lhZ: 0.08 };
export const SLEEP: Move = {
  keys: [
    [0, {}],
    [0.35, as({ nod: -0.15, lhX: 0.18, lhY: 0.85, lhZ: 0 })],
    [0.8, as(DOZING)],
    [ASLEEP - 0.1, as({ ...DOZING, nod: -0.15 })],
    [ASLEEP + 0.3, as({ nod: 0.1 })],
    [ASLEEP + 0.55, {}],
  ],
};
