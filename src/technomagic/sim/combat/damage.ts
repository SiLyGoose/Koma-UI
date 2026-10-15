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
 * King's Raid's soft caps: a stat's points past its soft cap count half (past `hard`, a fifth), so none is easily
 * pushed to 100%. Each stat's (SOFT) is where the fight uses it.
 */
export function soft(points: number, cap: number, hard = Infinity): number {
  if (points <= cap) return points;
  if (points <= hard) return cap + (points - cap) * 0.5;
  return cap + (hard - cap) * 0.5 + (points - hard) * 0.2;
}
/**
 * Each stat's soft cap (points): penetration, Tough and block DEF at 450; ACC, CC accuracy, CC resist and lifesteal at
 * 500; block and dodge at 500, with a hard cap at 1000; attack speed at 500 more than as quick as it comes (1000), with
 * a hard cap 1000 more.
 */
export const SOFT = { pen: 450, tough: 450, blockDef: 450, acc: 500, resist: 500, lifesteal: 500, chance: 500, hard: 1000 };

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
 * A boss's, besides: its chance of a critical blow on a hero (less the hero's crit resist), and its CC
 * resist (a stun on it lasts the shorter by as much, less the stunning hero's accuracy). In points.
 */
export interface BossStats extends Stats {
  crit: number;
  resist: number;
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
 * What a defense takes off a blow, as King's Raid has it (its community's formula, against a level 90 boss): DEF_MOST
 * of the blow at most, half of that at DEF_CURVE, never all of it. Defense is King's Raid's own size of DEF.
 */
const DEF_MOST = 0.9817;
const DEF_CURVE = 19_360.37;
/** A blocked blow does this much of what it would have (less its target's block DEF against that kind). */
const BLOCKED = 0.5;

/**
 * A blow of `amount` of a kind lands on `target`, from one with `pen` points of penetration: dodged (it
 * takes nothing), or what it takes once the target's defense against that kind (less what penetration
 * sees past) has worn it down, and whether it blocked it (then less again), and its Tough off what is left. `roll` is the
 * fight's chances (../sim/random.ts).
 */
export function strike(amount: number, type: DamageType, target: Defenses, pen: number, roll: () => number): { taken: number; blocked: boolean; dodged: boolean } {
  // (Each soft-capped: SOFT.)
  if (roll() < share(soft(target.dodge[type], SOFT.chance, SOFT.hard))) return { taken: 0, blocked: false, dodged: true };
  const blocked = roll() < share(soft(target.block[type], SOFT.chance, SOFT.hard));
  const defense = Math.max(0, target[type]) * (1 - share(soft(pen, SOFT.pen)));
  // Its defense, then its block, then its Tough: each takes its share off what the one before let through.
  const kept = blocked ? Math.max(0, BLOCKED - soft((target.blockDef?.[type] ?? 0) * POINTS, SOFT.blockDef) / POINTS) : 1;
  const tough = 1 - share(soft(target.tough?.[type] ?? 0, SOFT.tough));
  const cut = (DEF_MOST * defense) / (DEF_CURVE + defense);
  return { taken: amount * (1 - cut) * kept * tough, blocked, dodged: false };
}
