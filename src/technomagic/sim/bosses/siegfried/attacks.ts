import type { BossAttack, BossMove, Plan } from '../boss';

/**
 * His P.ATK at each stage, as King's Raid's playtest builds it (its Siegfried raid, chapter 10's dungeons 1101 to 1109: his
 * stats at the stage's level, times its MonsterTierTable entry: KR-extracted/scripts/boss-stats.mjs). His blows are shares of it.
 */
export const KR_ATK = [1_740_938, 2_291_250, 2_790_888, 3_560_201, 5_875_322, 8_003_111, 10_971_720, 18_293_418, 30_248_640];
/** What a blow takes: `of` his ATK at stage 1 (how much of that each skill's blow takes is ./skills.ts). */
const share = (of: number): readonly [number, number] => [of * (KR_ATK[0] as number), of * (KR_ATK[0] as number)];

/*
 * Siegfried's attacks, as the fight has them: he is one body (`S`), his moves one after another, each taking so long, its
 * blow landing so far into it (his skills' timelines in King's Raid's playtest: Raid/Tech/SiegFried). What comes of each
 * as it lands is ./skills.ts; how he moves for each is the page's (../../../bosses/siegfried/).
 */

/** His one part: all his moves are his body's. */
export const BODY = 'S';

/** How long each of his moves takes, when its blow lands, and what that takes of whoever it lands on, before their defense. */
export const MOVES: Readonly<Record<string, BossMove>> = {
  // His sword, three blows of 120% (at 0.4, 0.8 and 1.8 seconds into his attack's 2.8).
  swing1: { length: 0.6, hit: 0.4, hurts: share(1.2) },
  swing2: { length: 0.6, hit: 0.2, hurts: share(1.2) },
  swing3: { length: 1.6, hit: 0.6, hurts: share(1.2) },
  // Divine Strike: his sword charged and swung down the line (200%), then again on it (200%), at 1.4 and 2.4 seconds of 4.
  strike1: { length: 2, hit: 1.4, hurts: share(2) },
  strike2: { length: 2, hit: 0.4, hurts: share(2) },
  // Divine Storm of Blades: his swords of light called up (nothing lands), twenty of them on every hero (30% each, every
  // 0.3 seconds from 2.7), then the divine sword of light on them all (300%, at 9.8 seconds of 11.2).
  summon: { length: 2.7, hit: null },
  blade: { length: 0.3, hit: 0, hurts: share(0.3) },
  judgement: { length: 2.5, hit: 1.1, hurts: share(3) },
  // Divine Power: up again, whole, as he would be beaten (its blow, at 1.2 seconds of 2.2, is what it does for him).
  rise: { length: 2.2, hit: 1.2 },
};

const SWORD: Plan = [
  ['swing1', BODY, 0],
  ['swing2', BODY, 0],
  ['swing3', BODY, 0],
];

/** His moves in each of his attacks, by the attack's name: each after the last is done. */
export const PLANS: Readonly<Record<string, Plan>> = {
  // His sword, as long as it is in each of his lives (the second and third wider: ./skills.ts).
  slash: SWORD,
  slash2: SWORD,
  slash3: SWORD,
  strike: [
    ['strike1', BODY, 0],
    ['strike2', BODY, 0],
  ],
  storm: [['summon', BODY, 0], ...Array.from({ length: 20 }, () => ['blade', BODY, 0] as const), ['judgement', BODY, 0]],
  rise: [['rise', BODY, 0]],
};

/** His attacks, as Boss auto picks them (his sword, as it is in the life he is in, whenever no skill is ready) and as their buttons say. */
export const ATTACKS: readonly BossAttack[] = [
  { name: 'slash', label: 'Sword' },
  { name: 'slash2', label: 'Sword (second life)' },
  { name: 'slash3', label: 'Sword (third life)' },
  { name: 'strike', label: 'Divine Strike' },
  { name: 'storm', label: 'Divine Storm of Blades' },
  { name: 'rise', label: 'Divine Power' },
];
