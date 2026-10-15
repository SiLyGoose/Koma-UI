import { settle, smooth, snap, type Key } from '../../engine/track';
import type { Attack } from '../../sim/bosses/galgoria/attacks';

/*
 * Galgoria's heads, as they move for each of its attacks: what its body is drawn doing (./model.ts). How long each
 * move takes and when its blow lands are the fight's (../../sim/bosses/galgoria/attacks.ts): these are written to fit.
 */

/** Where a head is, from where it rests: ahead, up, toward the middle (0 to 1), nodding down, its jaw open (0 to 1), and how far the body leans in. */
export type Pose = {
  ahead: number;
  up: number;
  inward: number;
  nod: number;
  jaw: number;
  lean: number;
  shake: number;
};

export const STILL: Pose = { ahead: 0, up: 0, inward: 0, nod: 0, jaw: 0, lean: 0, shake: 0 };

/** An attack: its track, and when in it its venom sprays. */
export const TRACKS: Record<Attack, { keys: Key<Pose>[]; spray?: readonly [number, number] }> = {
  // Back and up a little, then a short way out toward the heroes with its jaw wide, its venom spraying from it while
  // it holds there, and back. It doesn't go far: its necks are made to be seen from where they stand.
  spit: {
    keys: [
      [0, {}],
      [0.45, { ahead: -0.6, up: 0.4, nod: -0.25, jaw: 0.3, lean: -0.03 }, smooth],
      [0.6, { ahead: 0.9, up: -0.7, inward: 0.35, nod: 0.35, jaw: 1, lean: 0.06 }, snap],
      [1.2, { ahead: 1, up: -0.8, inward: 0.35, nod: 0.38, jaw: 1, lean: 0.07, shake: 0.5 }, smooth],
      [1.35, { ahead: 0.9, up: -0.7, inward: 0.35, nod: 0.35, jaw: 0.2, lean: 0.06 }, settle],
      [2, {}, smooth],
    ],
    // (The venom takes a moment to get there.)
    spray: [0.6, 1.2],
  },
  // Up with its jaw wide, shaking, and back.
  roar: {
    keys: [
      [0, {}],
      [0.4, { ahead: -0.4, up: 0.5, nod: -0.5, jaw: 1, lean: -0.04, shake: 1 }, settle],
      [1.5, { ahead: -0.3, up: 0.55, nod: -0.46, jaw: 1, lean: -0.04, shake: 1 }, smooth],
      [2.1, {}, smooth],
    ],
  },
  // Reared high, then down into the swamp in front of it, and up again.
  slam: {
    keys: [
      [0, {}],
      [0.55, { ahead: -0.7, up: 0.8, nod: -0.45, jaw: 0.8, lean: -0.06 }, smooth],
      [0.75, { ahead: 1.4, up: -2.3, nod: 0.95, jaw: 0.3, lean: 0.12 }, snap],
      [1.15, { ahead: 1.35, up: -2.2, nod: 0.9, jaw: 0.2, lean: 0.11, shake: 0.6 }, settle],
      [1.9, {}, smooth],
    ],
  },
};
