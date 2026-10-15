import type { BossAttack, BossMove } from '../boss';
import { lengthOf, settle, smooth, snap, type Key } from '../../engine/track';

/*
 * Galgoria's attacks, as its heads move for them: what the fight goes by (../../sim/) and what its body is
 * drawn doing (./model.ts). Each of its skills is some of its heads' moves, one after another; what comes
 * of each as it lands is ./skills.ts.
 */

export type Head = 'C' | 'L' | 'R';
export const HEADS: readonly Head[] = ['C', 'L', 'R'];
export type Attack = 'spit' | 'roar' | 'slam';

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

/** An attack: its track, when in it its venom sprays and lands (`hit`), and what that takes of whoever it lands on, least to most, before their defense. */
export const TRACKS: Record<Attack, { keys: Key<Pose>[]; hit: number | null; spray?: readonly [number, number]; hurts?: readonly [number, number] }> = {
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
    // The venom takes a moment to get there.
    spray: [0.6, 1.2],
    hit: 0.88,
    hurts: [30_000, 45_000],
  },
  // Up with its jaw wide, shaking, and back: what it calls up lands as it begins to shake.
  roar: {
    keys: [
      [0, {}],
      [0.4, { ahead: -0.4, up: 0.5, nod: -0.5, jaw: 1, lean: -0.04, shake: 1 }, settle],
      [1.5, { ahead: -0.3, up: 0.55, nod: -0.46, jaw: 1, lean: -0.04, shake: 1 }, smooth],
      [2.1, {}, smooth],
    ],
    hit: 0.5,
    hurts: [20_000, 30_000],
  },
  // Reared high, then down into the swamp in front of it, and up again: the ground shakes where it lands.
  slam: {
    keys: [
      [0, {}],
      [0.55, { ahead: -0.7, up: 0.8, nod: -0.45, jaw: 0.8, lean: -0.06 }, smooth],
      [0.75, { ahead: 1.4, up: -2.3, nod: 0.95, jaw: 0.3, lean: 0.12 }, snap],
      [1.15, { ahead: 1.35, up: -2.2, nod: 0.9, jaw: 0.2, lean: 0.11, shake: 0.6 }, settle],
      [1.9, {}, smooth],
    ],
    hit: 0.75,
  },
};

/** A skill: the heads' moves, in order (a head with two goes on to its second once the first is done, `after` seconds later; any other waits `after` seconds to begin). */
export type Plan = readonly (readonly [Attack, Head, number])[];

/** The heads' moves in each of its skills, by its name. */
export const PLANS: Record<string, Plan> = {
  // A head's venom at whoever it is going for.
  left: [['spit', 'L', 0]],
  centre: [['spit', 'C', 0]],
  right: [['spit', 'R', 0]],
  // Swamp Destroyer: each head's venom in turn, then all three down into the swamp at once (the later a head
  // spat, the sooner it goes on, so they come down together).
  destroyer: [
    ['spit', 'L', 0],
    ['spit', 'C', 0.38],
    ['spit', 'R', 0.76],
    ['slam', 'L', 0.76],
    ['slam', 'C', 0.38],
    ['slam', 'R', 0],
  ],
  // Poisonous Swamp: a roar from them all, that calls up the swamp under the heroes.
  swamp: HEADS.map((head, i) => ['roar', head, i * 0.07] as const),
  // Poisonous Explosion: the side heads' venom, close together.
  explosion: [
    ['spit', 'L', 0],
    ['spit', 'R', 0.2],
  ],
  // Fatal Venom: the middle head's venom.
  fatal: [['spit', 'C', 0]],
};

/** Its attacks, as Boss auto picks them (one head's venom the most often, by itself) and as their buttons say. */
export const ATTACKS: readonly BossAttack[] = [
  { name: 'left', label: 'Left head' },
  { name: 'centre', label: 'Centre head' },
  { name: 'right', label: 'Right head' },
  { name: 'destroyer', label: 'Swamp Destroyer' },
  { name: 'swamp', label: 'Poisonous Swamp' },
  { name: 'explosion', label: 'Poisonous Explosion' },
  { name: 'fatal', label: 'Fatal Venom' },
];

/** How long each of its heads' moves takes, when its blow lands and what it takes: what the fight goes by. */
export const MOVES: Readonly<Record<Attack, BossMove>> = Object.fromEntries(
  (Object.entries(TRACKS) as [Attack, (typeof TRACKS)[Attack]][]).map(([name, { keys, hit, hurts }]) => [name, { length: lengthOf(keys), hit, ...(hurts ? { hurts } : {}) }]),
) as Record<Attack, BossMove>;
