import type { BossAttack, BossMove } from '../boss';

/*
 * Galgoria's attacks, as the fight has them: each of its skills is some of its heads' moves, one after another, and
 * each move takes so long, its blow landing so far into it. What comes of each as it lands is ./skills.ts; how its
 * heads move for each is the page's (../../../bosses/galgoria/tracks.ts, drawn to fit these).
 */

export type Head = 'C' | 'L' | 'R';
export const HEADS: readonly Head[] = ['C', 'L', 'R'];
export type Attack = 'spit' | 'roar' | 'slam';

/** How long each of its heads' moves takes, when its blow lands, and what that takes of whoever it lands on, least to most, before their defense. */
export const MOVES: Readonly<Record<Attack, BossMove>> = {
  // Its venom: it takes a moment to get there.
  spit: { length: 2, hit: 0.88, hurts: [30_000, 45_000] },
  // What it calls up lands as it begins to shake.
  roar: { length: 2.1, hit: 0.5, hurts: [20_000, 30_000] },
  // Down into the swamp: the ground shakes where it lands.
  slam: { length: 1.9, hit: 0.75 },
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
