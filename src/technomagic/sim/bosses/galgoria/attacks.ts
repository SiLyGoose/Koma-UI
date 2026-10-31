import type { BossAttack, BossMove } from '../boss';

/**
 * Its M.ATK at each stage, as King's Raid's playtest builds it (its Galgoria raid, chapter 10's stages 1 to 9: its stats at
 * the stage's level, times its MonsterTierTable entry: KR-extracted/scripts/boss-stats.mjs). Its blows are shares of it.
 */
export const KR_ATK = [4_515_117, 5_942_354, 8_184_999, 9_373_382, 13_161_563, 19_055_025, 23_048_231, 39_699_242, 69_801_164];
/** What a blow takes: `of` its ATK at stage 1 (how much of that each skill's blow takes is ./skills.ts). */
const share = (of: number): readonly [number, number] => [of * (KR_ATK[0] as number), of * (KR_ATK[0] as number)];

/*
 * Galgoria's attacks, as the fight has them: each of its skills is some of its heads' moves, one after another, and
 * each move takes so long, its blow landing so far into it. What comes of each as it lands is ./skills.ts; how its
 * heads move for each is the page's (../../../bosses/galgoria/tracks.ts, drawn to fit these).
 */

export type Head = 'C' | 'L' | 'R';
export const HEADS: readonly Head[] = ['C', 'L', 'R'];
export type Attack = 'spit' | 'roar' | 'slam';

/** How long each of its heads' moves takes, when its blow lands, and what that takes of whoever it lands on, before their defense (its ATK; each skill takes its share of it). */
export const MOVES: Readonly<Record<Attack, BossMove>> = {
  // Its venom: it takes a moment to get there.
  spit: { length: 2, hit: 0.88, hurts: share(1) },
  // What it calls up lands as it begins to shake: the swamp's blows, in all (the playtest's 30% a second, for 5 seconds).
  roar: { length: 2.1, hit: 0.5, hurts: share(1.5) },
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
  // (Its pattern alarm: King's Raid's BossWarningTable 101, the image one, "WARNING", for 2 seconds.)
  { name: 'fatal', label: 'Fatal Venom', warning: { image: 'warning', lasts: 2 } },
];
