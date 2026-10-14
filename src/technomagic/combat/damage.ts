/*
 * Damage: every blow is physical or magical, by who deals it, and whoever it lands on (a hero or a boss)
 * stands each kind with a defence of its own, and against each kind may dodge it altogether or block
 * some of it. Whoever deals it may see past some of that defence (its penetration). Nothing here is
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

/** How a fighter stands what comes at it: its defence against each kind of damage, and its chance against each to block it, or dodge it. */
export interface Defenses {
  physical: number;
  magical: number;
  block: PerKind;
  dodge: PerKind;
}

/** A fighter, hero or boss: its health, the kind of damage its blows deal, and how it stands others'. */
export interface Stats extends Defenses {
  hp: number;
  deals: DamageType;
}

/**
 * A hero's, besides: its attack (how hard its blows are, and its heals and shields: a skill's numbers are
 * as they are at ATK, and so many times as much for so many times its ATK); its crit chance; its attack
 * speed (everything it does is quicker by as much); its penetration; and its CC resist (what knocks it
 * down holds it the shorter by as much).
 */
export interface HeroStats extends Stats {
  atk: number;
  crit: number;
  speed: number;
  pen: number;
  resist: number;
}

/** The attack a skill's numbers are written for. */
export const ATK = 1000;
/** A defence of this much halves what gets through (twice it: a third, and so on). */
const HALVING = 1000;
/** A blocked blow does this much of what it would have. */
const BLOCKED = 0.5;
/** The most of a defence penetration sees past, however much there is (in points). */
const PEN_MOST = 500;

/**
 * A blow of `amount` of a kind lands on `target`, from one with `pen` points of penetration: dodged (it
 * takes nothing), or what it takes once the target's defence against that kind (less what penetration
 * sees past) has worn it down, and whether it blocked it (then less again). `roll` is the fight's chances (../sim/random.ts).
 */
export function strike(amount: number, type: DamageType, target: Defenses, pen: number, roll: () => number): { taken: number; blocked: boolean; dodged: boolean } {
  if (roll() < share(target.dodge[type])) return { taken: 0, blocked: false, dodged: true };
  const blocked = roll() < share(target.block[type]);
  const defence = Math.max(0, target[type]) * (1 - share(Math.min(PEN_MOST, pen)));
  return { taken: amount * (HALVING / (HALVING + defence)) * (blocked ? BLOCKED : 1), blocked, dodged: false };
}
