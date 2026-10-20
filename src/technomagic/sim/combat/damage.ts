/*
 * Damage: every blow is physical or magical, by who deals it, and whoever it lands on (a hero or a boss)
 * stands each kind with a defense of its own, and against each kind may dodge it altogether or block
 * some of it. Whoever deals it may see past some of that defense (its penetration). Nothing here is
 * drawn: only the sums.
 *
 * Chances and shares are in points, as the game has them: 1000 points is 100% (a crit chance, a block,
 * a dodge, attack speed, penetration, CC resist).
 */

export type DamageType = 'physical' | 'magical';

/** Something a fighter has against each kind of damage. */
export type PerKind = Record<DamageType, number>;
/** Nothing against either kind. */
export const NONE: PerKind = { physical: 0, magical: 0 };

/** As many points as are 100%. */
export const POINTS = 1000;
/** The share of a stat in points (0 to 1). */
export const share = (points: number): number => Math.min(1, Math.max(0, points / POINTS));

/**
 * One of King's Raid's curves for a stat (its StatAttenuationTable): its points as they count. Up to `x2` as they are; up to
 * `x1`, a2 x + b2 (thousandths); past `x1`, ever nearer `maxK` (maxK - maxK / (a1 x² + b1 x + 1)); below `x3`, ever nearer
 * `minK`; below `x4`, minK / (a4 x² + b4 x + 1) (x in thousandths). What it doesn't give is 0.
 */
interface Curve {
  maxK: number;
  x1: number;
  a1: number;
  b1: number;
  x2: number;
  a2: number;
  b2: number;
  minK?: number;
  x3?: number;
  a3?: number;
  b3?: number;
  x4?: number;
  a4?: number;
  b4?: number;
}
/** As StatAttenuationData.Attenuate. */
export function curved(c: Curve, x: number): number {
  if (x === 0) return 0;
  // (What a curve doesn't say is 0, as the game's table has it: most stats below none count as none.)
  const { minK = 0, x3 = 0, a3 = 0, b3 = 0, x4 = 0, a4 = 0, b4 = 0 } = c;
  const toward = (k: number, a: number, b: number): number => k - (k * 1e6) / (a * x * x + b * x + 1e6);
  if (x > c.x1) return toward(c.maxK, c.a1, c.b1);
  if (x > c.x2) return (c.a2 * x) / 1000 + c.b2;
  if (x < x3) return toward(minK, a3, b3);
  if (x < x4) return (minK * 1e6) / (a4 * x * x + b4 * x + 1e6);
  return x;
}
/**
 * King's Raid's curves (its playtest's), for the stats the fight has: crit chance; a chance against a blow (dodge and
 * block) or a crit (crit resist), and lifesteal; block DEF (more off a blocked blow, on top of the game's 500); ACC
 * (hit chance); penetration and Tough; CC resist; CC accuracy (the game's HitCcChance); and attack speed (all of it: 1000
 * as quick as it comes).
 */
export const CURVE = {
  crit: { maxK: 2000, x1: 2000, a1: 1, b1: 1500, x2: 1500, a2: 500, b2: 750, x3: -500 },
  chance: { maxK: 1000, x1: 1000, a1: 3, b1: 0, x2: 500, a2: 500, b2: 250, x3: -500 },
  blockDef: { maxK: 450, x1: 775, a1: 3, b1: 1500, x2: 225, a2: 204, b2: 179, minK: -920, x3: -2, a3: 3, b3: -938, x4: -1 },
  acc: { maxK: 2000, x1: 2000, a1: 1, b1: 1500, x2: 1500, a2: 500, b2: 750, minK: -920, x3: -2, a3: 3, b3: -938, x4: -1 },
  pen: { maxK: 900, x1: 1000, a1: 2, b1: 1000, x2: 450, a2: 409, b2: 266, x3: -500 },
  resist: { maxK: 1000, x1: 1000, a1: 1e6, b1: 1e6, x2: 500, a2: 1000, b2: 0, x3: -500 },
  accuracy: { maxK: 900, x1: 900, a1: 1e6, b1: 1e6, x2: 450, a2: 1000, b2: 0, x3: -500 },
  speed: { maxK: 2500, x1: 2400, a1: 1, b1: -733, x2: 1600, a2: 500, b2: 800, minK: 250, x3: -10000, x4: 500, a4: 1, b4: -1500 },
} as const satisfies Record<string, Curve>;
/** The slowest an attack speed counts as (the game's MinAttackSpeed). */
export const SLOWEST = 300;

/**
 * How a fighter stands what comes at it: its defense against each kind of damage, and its chance against each to block it,
 * or dodge it; `blockDef`, how much more of a blow of each kind its block takes off (a share: 0.23 is 23% more); and
 * `tough`, King's Raid's Tough against each kind (points): that share of whatever gets past its defense and block taken
 * off, every blow.
 */
export interface Defenses {
  physical: number;
  magical: number;
  block: PerKind;
  dodge: PerKind;
  blockDef?: PerKind;
  tough?: PerKind;
}

/** A fighter, hero or boss: its health, the kind of damage its blows deal, and how it stands others'. */
export interface Stats extends Defenses {
  hp: number;
  deals: DamageType;
}

/**
 * A boss's, besides: its chance of a critical blow on a hero (less the hero's crit resist), its CC resist (a stun on it
 * lasts the shorter by as much, less the stunning hero's accuracy), and its penetration. In points.
 */
export interface BossStats extends Stats {
  crit: number;
  resist: number;
  /** Its penetration (points): what of a hero's defense its blows see past (none said: none). */
  pen?: number;
  /** Its hit chance (points): what of a hero's dodge its blows see past (none said: none). */
  acc?: number;
}

/**
 * A hero's, besides: its attack (how hard its blows are, and its heals and shields: a skill's numbers are
 * as they are at ATK, and so many times as much for so many times its ATK); its crit chance; how much harder
 * its critical blows are (a share more); its attack speed (points, as the game has them: 1000 is as quick as it comes, 1500 half again as quick); its
 * penetration; its ACC (what of the boss's dodge and block it sees past); and its CC resist (what knocks it down
 * holds it the shorter by as much).
 */
export interface HeroStats extends Stats {
  atk: number;
  crit: number;
  critDamage: number;
  speed: number;
  pen: number;
  acc: number;
  resist: number;
}

/**
 * The attack a heal's or a shield's numbers are written for (as much HP as it says, from a hero with this much ATK; so
 * many times as much for so many times its ATK): King's Raid's classes' average ATK, an assassin's. A blow's numbers
 * are thousandths of its hero's ATK, as the game's shares have them (1000: a blow as hard as its ATK).
 */
export const ATK = 19_592;
/**
 * What a defense takes off a blow, as King's Raid has it (its playtest's StatController.CalculateDamage): DEF_MOST of
 * the blow at most, and as much of that as its defense is of the most that counts against its attacker's level (`reach`:
 * reachAt). Defense is King's Raid's own size of DEF.
 */
const DEF_MOST = 0.9;
/** The level a hero fights at (its reach, for a boss's defense). */
export const HERO_LEVEL = 100;
/**
 * The most defense that counts against an attacker of each level from 30 (King's Raid's DefenceLevelTable, the Normal
 * Dragon Raid's lowest stage's level): straight from one of these levels to the next, and on past the last as from the one before.
 */
const REACH: readonly (readonly [level: number, most: number])[] = [
  [30, 7_258],
  [40, 13_287],
  [50, 24_510],
  [60, 74_200],
  [70, 155_459],
  [80, 196_561],
  [90, 198_457],
  [100, 294_062],
  [130, 470_477],
];
/** The most defense that counts against an attacker of `level`. */
export function reachAt(level: number): number {
  let i = 1;
  while (i < REACH.length - 1 && level > (REACH[i] as readonly [number, number])[0]) i++;
  const [l0, m0] = REACH[i - 1] as readonly [number, number];
  const [l1, m1] = REACH[i] as readonly [number, number];
  return Math.max(1, m0 + ((m1 - m0) * (level - l0)) / (l1 - l0));
}
/** A blocked blow does this much of what it would have (less its target's block DEF against that kind). */
const BLOCKED = 0.5;

/**
 * A blow of `amount` of a kind lands on `target`, from one with `pen` points of penetration and `acc` of ACC (its hit chance)
 * whose level has `reach` (reachAt): dodged (it takes nothing), or what it takes once the target's defense against that kind
 * (less what penetration sees past) has worn it down, and whether it blocked it (then less again), and its Tough off what is
 * left. `roll` is the fight's chances (../sim/random.ts).
 */
export function strike(amount: number, type: DamageType, target: Defenses, pen: number, reach: number, roll: () => number, acc = 0): { taken: number; blocked: boolean; dodged: boolean } {
  // (Each on King's Raid's curve for it: CURVE. Its ACC sees past as much of the dodge, as King's Raid's hit chance does.)
  if (roll() < share(curved(CURVE.chance, target.dodge[type]) - curved(CURVE.acc, acc))) return { taken: 0, blocked: false, dodged: true };
  const blocked = roll() < share(curved(CURVE.chance, target.block[type]));
  const defense = Math.max(0, target[type]) * (1 - share(curved(CURVE.pen, pen)));
  // Its defense, then its block, then its Tough: each takes its share off what the one before let through.
  const kept = blocked ? Math.max(0, BLOCKED - curved(CURVE.blockDef, (target.blockDef?.[type] ?? 0) * POINTS) / POINTS) : 1;
  const tough = 1 - share(curved(CURVE.pen, target.tough?.[type] ?? 0));
  const cut = DEF_MOST * Math.min(1, defense / reach);
  return { taken: amount * (1 - cut) * kept * tough, blocked, dodged: false };
}
