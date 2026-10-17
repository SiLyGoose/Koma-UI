import { settle, smooth, snap, type Key } from '../../engine/track';
import type { DragonMove } from '../../sim/bosses/dragon/moves';

/*
 * A dragon's body, as it moves for each of its moves: what it is drawn doing (./model.ts). How long each move takes and
 * when its blow lands are the fight's (../../sim/bosses/dragon/moves.ts): these are written to fit.
 */

/**
 * Where a dragon is, from how it stands: its front reared up (radians), all of it off the floor (`lift`) and turned
 * (`yaw`); its neck down (less than 0: up) and turned toward its left, its head down, its jaw open (0 to 1); its wings
 * raised (they stand raised at rest: less than 0 beats them down and out) and swept back; its tail swung toward its left and lifted; its
 * front leaned onto its left (its right shoulder up: less than 0 the other way); each foreclaw taken up off the floor to swipe
 * (`paw`, 0 to 1) and how far along its swipe it is (`rake`: -1 raised high and out to its own side, 1 raked across ahead of it
 * and down toward its other side); and how much it shakes.
 */
export type Pose = {
  rear: number;
  lift: number;
  yaw: number;
  neck: number;
  turn: number;
  head: number;
  jaw: number;
  wings: number;
  fold: number;
  tail: number;
  tailUp: number;
  roll: number;
  paw: number;
  rake: number;
  pawL: number;
  rakeL: number;
  shake: number;
};

export const STILL: Pose = { rear: 0, lift: 0, yaw: 0, neck: 0, turn: 0, head: 0, jaw: 0, wings: 0, fold: 0, tail: 0, tailUp: 0, roll: 0, paw: 0, rake: 0, pawL: 0, rakeL: 0, shake: 0 };

/** How high it hovers, up on its wings. */
export const HOVER = 4.5;

/** Each move: its track, and when in it its breath streams from its mouth (and how wide it sweeps, side to side). */
export const TRACKS: Record<DragonMove, { keys: Key<Pose>[]; breath?: readonly [number, number] }> = {
  // Back and up, then its jaws down at whoever it is going for, snapping shut as they land.
  bite: {
    keys: [
      [0, {}],
      [0.55, { rear: 0.12, neck: -0.45, head: -0.25, jaw: 0.7 }, smooth],
      [0.8, { rear: -0.05, neck: 0.55, head: 0.25, jaw: 0, turn: -0.1 }, snap],
      [1.05, { rear: -0.04, neck: 0.5, head: 0.22, jaw: 0.1, shake: 0.4 }, settle],
      [1.7, {}, smooth],
    ],
  },
  // Up on its hind legs, its right foreclaw raised high and out, and raked across in front of it at whoever it is going for, its
  // weight thrown after it.
  claw: {
    keys: [
      [0, {}],
      [0.45, { rear: 0.25, roll: 0.18, paw: 1, rake: -1, neck: -0.15, turn: -0.15, jaw: 0.4, tail: -0.25 }, smooth],
      [0.75, { rear: -0.06, roll: -0.12, paw: 1, rake: 1, neck: 0.25, turn: 0.15, jaw: 0.6, tail: 0.3 }, snap],
      [1, { rear: -0.05, roll: -0.1, paw: 0.85, rake: 1, neck: 0.22, turn: 0.12, jaw: 0.25, tail: 0.25, shake: 0.4 }, settle],
      [1.6, {}, smooth],
    ],
  },
  // Its left foreclaw raised high, and swept wide across the whole field, its tail lashing round after it.
  sweep: {
    keys: [
      [0, {}],
      [0.6, { rear: 0.28, roll: -0.2, pawL: 1, rakeL: -1, yaw: 0.12, neck: -0.15, turn: 0.2, jaw: 0.4, tail: -0.6, tailUp: 0.15 }, smooth],
      [1, { rear: -0.05, roll: 0.14, pawL: 1, rakeL: 1, yaw: -0.15, neck: 0.25, turn: -0.2, jaw: 0.6, tail: 0.9, tailUp: 0.05 }, snap],
      [1.3, { rear: -0.04, roll: 0.12, pawL: 0.85, rakeL: 1, yaw: -0.13, neck: 0.22, turn: -0.15, jaw: 0.25, tail: 0.7, shake: 0.3 }, settle],
      [2.1, {}, smooth],
    ],
  },
  // Its tail raised high over its back, and brought down hard.
  smash: {
    keys: [
      [0, {}],
      [0.35, { tailUp: 1.1, tail: 0.3, rear: 0.08 }, smooth],
      [0.55, { tailUp: -0.35, tail: 0.15, rear: -0.04 }, snap],
      [0.7, { tailUp: -0.3, tail: 0.15, shake: 0.6 }, settle],
      [1.1, {}, smooth],
    ],
  },
  // Up, its head high, breathing in, its wings opening.
  inhale: {
    keys: [
      [0, {}],
      [1, { rear: 0.28, neck: -0.6, head: -0.35, jaw: 0.25, wings: 0.15, shake: 0.2 }, smooth],
      [1.4, { rear: 0.2, neck: -0.2, head: -0.1, jaw: 0.8, wings: -0.2 }, smooth],
    ],
  },
  // Its jaws wide and its head low toward the heroes, the breath pouring out (each of these sweeps a little on: ./model.ts).
  breath: {
    keys: [
      [0, { rear: 0.2, neck: 0.15, head: 0.15, jaw: 1, wings: -0.2, shake: 0.3 }],
      [0.55, { rear: 0.2, neck: 0.15, head: 0.15, jaw: 1, wings: -0.2, shake: 0.3 }],
    ],
    breath: [0, 0.55],
  },
  // Reared up, its head thrown back and its jaws wide, its wings high.
  roar: {
    keys: [
      [0, {}],
      [0.45, { rear: 0.35, neck: -0.7, head: -0.5, jaw: 1, wings: 0.2, fold: -0.3, shake: 1 }, settle],
      [1.5, { rear: 0.32, neck: -0.65, head: -0.45, jaw: 1, wings: 0.2, fold: -0.3, shake: 1 }, smooth],
      [2.1, {}, smooth],
    ],
  },
  // Its wings down hard, and up off the floor.
  rise: {
    keys: [
      [0, {}],
      [0.4, { wings: 0.25, rear: 0.1 }, smooth],
      [0.75, { wings: -0.9, lift: HOVER * 0.5, rear: 0.15 }, snap],
      [1.1, { wings: 0.2, lift: HOVER * 0.8, rear: 0.15 }, smooth],
      [1.4, { wings: -0.5, lift: HOVER, rear: 0.1 }, smooth],
    ],
  },
  // Hovering, its wings beating, its head down at the heroes as it casts.
  storm: {
    keys: [
      [0, { wings: -0.5, lift: HOVER, rear: 0.1 }],
      [0.25, { wings: 0.2, lift: HOVER + 0.3, rear: 0.1, neck: 0.3, jaw: 0.9 }, smooth],
      [0.5, { wings: -0.9, lift: HOVER - 0.2, rear: 0.05, neck: 0.4, head: 0.2, jaw: 1, shake: 0.6 }, snap],
      [1, { wings: -0.5, lift: HOVER, rear: 0.1 }, smooth],
    ],
  },
  // Down from the air with all its weight, wings spread, and the field shaking.
  land: {
    keys: [
      [0, { wings: -0.5, lift: HOVER, rear: 0.1 }],
      [0.55, { wings: 0.2, lift: HOVER + 1, rear: 0.25, neck: -0.3, jaw: 0.6 }, smooth],
      [0.85, { wings: -0.7, lift: 0, rear: -0.1, neck: 0.35, head: 0.2, jaw: 0.9, shake: 1 }, snap],
      [1.05, { wings: -0.6, rear: -0.08, neck: 0.3, jaw: 0.5, shake: 0.8 }, settle],
      [1.3, {}, smooth],
    ],
  },
  // Its head down and toward the hero, eyes on them, holding still.
  gaze: {
    keys: [
      [0, {}],
      [0.6, { neck: 0.3, head: 0.3, turn: -0.15, rear: 0.05 }, smooth],
      [1.1, { neck: 0.35, head: 0.35, turn: -0.15, jaw: 0.2, shake: 0.3 }, settle],
      [1.8, {}, smooth],
    ],
  },
};
