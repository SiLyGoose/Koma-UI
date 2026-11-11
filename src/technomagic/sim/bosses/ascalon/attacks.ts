import type { BossAttack, BossMove, Plan } from '../boss';

/**
 * His P.ATK at each stage, as King's Raid's playtest builds it (its Ascalon raid, chapter 10's dungeons 1201 to 1209: his stats
 * at the stage's level, times its MonsterTierTable entry: KR-extracted/scripts/boss-stats.mjs). His blows are shares of it.
 */
export const KR_ATK = [4_874_625, 5_880_875, 6_641_350, 7_337_439, 6_117_494, 6_859_809, 8_640_230, 12_911_642, 20_480_850];
/** What a blow takes: `of` his ATK at stage 1 (his skills' GetPhysicalDamageR, thousandths: 1300 is 1.3). */
export const share = (of: number): readonly [number, number] => [of * (KR_ATK[0] as number), of * (KR_ATK[0] as number)];

/*
 * Ascalon's attacks, as the fight has them: he is one body (`A`), his moves one after another, each taking so long, its blow
 * landing so far into it (his skills' timelines in King's Raid's playtest: SkillTable 3592000 to 3592030, their TickTimeValue).
 * What comes of each as it lands is ./skills.ts; how he moves for each is the page's. King's Raid's clips for them (his skill
 * script, Raid.Tech.Ascalon's BeginFireSkill_*): Attack, Skill1, Skill2, Skill3 (and Advent as he comes in). His Dimension
 * Barrage (3592040) and his waves' Eye of Ascalon are no moves of his: they go off on their own timers (./skills.ts).
 */

/** His one part: all his moves are his body's. */
export const BODY = 'A';

/** How long each of his moves takes, when its blow lands, and what that takes of whoever it lands on, before their defense. */
export const MOVES: Readonly<Record<string, BossMove>> = {
  // His attack (3592000, clip Attack, 5.8 s): two sweeps before him of 130% (6 m, 90°: Skill.Boss.Ascalon.Attack1.Hit1, at 1.7
  // and 2.4 s), then a blow of 110% on the hero furthest off and those within 1.5 m of it (Attack1.Hit2, at 4.1 s).
  swipe1: { length: 2, hit: 1.7, hurts: share(1.3) },
  swipe2: { length: 1, hit: 0.4, hurts: share(1.3) },
  smite: { length: 2.8, hit: 1.7, hurts: share(1.1) },
  // Multi-Dimension Barrage (3592010, clip Skill1, 4.5 s): dimensional energy charged (nothing lands), then four bolts of 85%
  // on the hero that has dealt the most (Skill1.Projectile / Skill1.Hit, at 3.1, 3.2, 3.3 and 3.4 s).
  charge: { length: 3.1, hit: null },
  bolt: { length: 0.1, hit: 0, hurts: share(0.85) },
  'bolt-last': { length: 1.1, hit: 0, hurts: share(0.85) },
  // Dimension Warp (3592020, clip Skill2, 2.9 s): at 2 s his warp (Skill2.Buff, Portal) and the Synthetic Demon Beasts called up.
  warp: { length: 2.9, hit: 2 },
  // Land of Destruction (3592030, clip Skill3, 6.8 s): his roar, its stun and shields broken four times (at 2, 2.2, 2.4 and
  // 2.6 s), then two quakes of 140% on every hero, each knocking them down (Skill3.Hit, at 4.5 and 5.4 s).
  roar1: { length: 2.2, hit: 2 },
  roar2: { length: 0.2, hit: 0 },
  roar3: { length: 0.2, hit: 0 },
  roar4: { length: 1.9, hit: 0 },
  quake1: { length: 0.9, hit: 0, hurts: share(1.4) },
  quake2: { length: 1.4, hit: 0, hurts: share(1.4) },
};

/** His moves in each of his attacks, by the attack's name: each after the last is done. */
export const PLANS: Readonly<Record<string, Plan>> = {
  attack: [
    ['swipe1', BODY, 0],
    ['swipe2', BODY, 0],
    ['smite', BODY, 0],
  ],
  barrage: [
    ['charge', BODY, 0],
    ['bolt', BODY, 0],
    ['bolt', BODY, 0],
    ['bolt', BODY, 0],
    ['bolt-last', BODY, 0],
  ],
  warp: [['warp', BODY, 0]],
  destruction: [
    ['roar1', BODY, 0],
    ['roar2', BODY, 0],
    ['roar3', BODY, 0],
    ['roar4', BODY, 0],
    ['quake1', BODY, 0],
    ['quake2', BODY, 0],
  ],
};

/** His attacks, as Boss auto picks them (his attack whenever no skill is ready; his skills in their slots' order) and as their buttons say. */
export const ATTACKS: readonly BossAttack[] = [
  { name: 'attack', label: 'Attack' },
  { name: 'barrage', label: 'Multi-Dimension Barrage' },
  // (Its pattern alarm: King's Raid's BossWarningTable 104, RAID_WARNING_ASCALON_1, for 3 seconds, CantCancel.)
  { name: 'warp', label: 'Dimension Warp', warning: { text: 'Ascalon warps dimensions and summons Synthetic Demon Beasts.', colour: '#ff8200', lasts: 3 } },
  { name: 'destruction', label: 'Land of Destruction' },
];
