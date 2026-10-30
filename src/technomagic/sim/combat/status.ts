import type { Art } from '../shown';
import type { DamageType } from './damage';

/*
 * What a skill leaves on a fighter for a while: the boss easier to hurt or hitting less hard, the heroes
 * taking less. Each changes what its bearer takes (of every kind of damage, or of some), how hard it
 * hits, how much healing and mana reach it, or whether it can act at all, until it runs out.
 */

/** `shown` is how the page shows it: a mark under the boss's health, a square on a hero's card. */
export interface Status<Shown> {
  name: string;
  /** Its picture, where the page can't tell it by its name or by whose skill put it there (a boss's own: ../shown.ts). */
  art?: Art;
  /** Seconds it has left (Infinity: for the rest of the fight). */
  left: number;
  /** What its bearer takes is this many times as much: of every kind, or of each kind it names. */
  takes?: number | Partial<Record<DamageType, number>>;
  /** Its bearer's blows are this many times as hard. */
  deals?: number;
  /** Everything its bearer does goes this many times as fast (a hero's: its attack quickened). */
  pace?: number;
  /** Healing reaches its bearer this many times as much. */
  heals?: number;
  /** Its bearer's mana fills this many times as fast. */
  mana?: number;
  /** Added to how likely its bearer's blows are to be critical. */
  crit?: number;
  /** Added to how many times as hard its bearer's critical blows are (0.5: half again). */
  critDamage?: number;
  /**
   * Added to its bearer's ATK (a share, with its others: King's Raid's ATK adds up), ATK Spd, Tough against both kinds of
   * damage, ACC (its hit chance) and crit chance (points, before King's Raid's curve for each).
   */
  atk?: number;
  speed?: number;
  tough?: number;
  acc?: number;
  critPoints?: number;
  /** Added to its bearer's penetration (points). */
  pen?: number;
  /** Its bearer's defense is this many times as much: against every kind, or against each kind it names. */
  defends?: number | Partial<Record<DamageType, number>>;
  /** Added to a hero bearing it's defense against each kind it names (before what makes it so many times as much). */
  bolsters?: Partial<Record<DamageType, number>>;
  /** Added to its bearer's chance to dodge each kind it names (points; less than none: less likely). */
  dodges?: Partial<Record<DamageType, number>>;
  /** Added to its bearer's chance to block each kind it names (points). */
  blocks?: Partial<Record<DamageType, number>>;
  /** Added to its bearer's CC resist (points); and to a hero bearing it's CC ACC (points: what of the boss's CC resist its stuns see past). */
  resist?: number;
  accuracy?: number;
  /** Added to how likely the blows on its bearer are to be critical (points: of every kind, or of each kind it names): the boss's Crit Resistance lowered. */
  critTaken?: number | Partial<Record<DamageType, number>>;
  /** Taken off how likely the blows on its bearer are to be critical (points): of every kind, or of each kind it names. */
  critResist?: number | Partial<Record<DamageType, number>>;
  /** Its bearer can do nothing while it is on (knocked down, imprisoned); and is out of the fight altogether, not to be aimed at. */
  binds?: boolean;
  away?: boolean;
  /** Its bearer can't be knocked down while it is on. */
  guards?: boolean;
  /** Its bearer's skills are sealed while it is on: it still attacks, but can use none of them (Siegfried's Divine Storm of Blades). */
  seals?: boolean;
  /** How many are stacked up in it. */
  count?: number;
  shown: Shown;
}

/** Puts a status on: in place of one of the same name, begun again. */
export function put<Shown>(on: Status<Shown>[], status: Status<Shown>): void {
  const at = on.findIndex((each) => each.name === status.name);
  if (at < 0) on.push(status);
  else on[at] = status;
}

/** Time passes: each has that much less left, and the ones run out are gone. */
export function wear<Shown>(on: Status<Shown>[], dt: number): void {
  for (let i = on.length - 1; i >= 0; i--) {
    const status = on[i] as Status<Shown>;
    status.left -= dt;
    if (status.left <= 0) on.splice(i, 1);
  }
}

/**
 * King's Raid's way with what makes something so many times as much (each a share: 1.3 is 30% more, 0.8 20% less): what is
 * of one kind adds up, rather than each going on top of the last (two of 30% more: 60% more, not 69%). A stat's (ATK, DEF,
 * attack speed, healing, mana): all its shares added, and less than 50% less ever nearer all of it but never there
 * (StatController.AttenuateStatUnderMinX), and never below none.
 */
export function stacked(times: Iterable<number>): number {
  let sum = 0;
  for (const t of times) sum += t - 1;
  // (Past 50% less: the game's -1000 + 1e9 / (2x² - 1000x + 1e6), x in thousandths.)
  if (sum < -0.5) {
    const x = sum * 1000;
    sum = (-1000 + 1e9 / (2 * x * x - 1000 * x + 1e6)) / 1000;
  }
  return Math.max(0, 1 + sum);
}
/**
 * Damage's (StatController.GiveDamage): what makes it more adds up (the dealer's DMG and the bearer's weakness alike), what
 * makes it less adds up apart, and the one goes on top of the other; all of it less is none.
 */
export function amplified(times: Iterable<number>): number {
  let more = 0;
  let less = 0;
  for (const t of times) {
    if (t > 1) more += t - 1;
    else less += 1 - t;
  }
  return (1 + more) * Math.max(0, 1 - less);
}

/** What each of these makes a kind of damage its bearer takes (so many times as much). */
export const takes = (on: readonly Status<unknown>[], type: DamageType): number[] => on.map(({ takes }) => (typeof takes === 'number' ? takes : (takes?.[type] ?? 1)));
/** What each makes its bearer's blows (so many times as hard). */
export const deals = (on: readonly Status<unknown>[]): number[] => on.map(({ deals }) => deals ?? 1);
/** What each makes its bearer's defense against a kind of damage (so many times as much). */
export const defends = (on: readonly Status<unknown>[], type: DamageType): number[] => on.map(({ defends }) => (typeof defends === 'number' ? defends : (defends?.[type] ?? 1)));

/** How many times as much of a kind of damage a bearer of these takes. */
export const taking = (on: readonly Status<unknown>[], type: DamageType): number => amplified(takes(on, type));
/** How many times as hard a bearer of these hits. */
export const dealing = (on: readonly Status<unknown>[]): number => amplified(deals(on));
/** How many times as fast a bearer of these is (`and`: more of the kind, besides). */
export const pacing = (on: readonly Status<unknown>[], ...and: readonly number[]): number => stacked([...on.map(({ pace }) => pace ?? 1), ...and]);
/** How many times as much healing reaches a bearer of these (`and`: more of the kind, besides). */
export const healing = (on: readonly Status<unknown>[], ...and: readonly number[]): number => stacked([...on.map(({ heals }) => heals ?? 1), ...and]);
/** How many times as fast a bearer of these gains mana (`and`: more of the kind, besides). */
export const filling = (on: readonly Status<unknown>[], ...and: readonly number[]): number => stacked([...on.map(({ mana }) => mana ?? 1), ...and]);

/** What these add to how likely a bearer's blows are to be critical. */
export function critting(on: readonly Status<unknown>[]): number {
  let more = 0;
  for (const { crit } of on) more += crit ?? 0;
  return more;
}

/** What these add to how many times as hard a bearer's critical blows are. */
export function critDamaging(on: readonly Status<unknown>[]): number {
  let more = 0;
  for (const { critDamage } of on) more += critDamage ?? 0;
  return more;
}

/** What these add to a bearer's penetration (points). */
export function piercing(on: readonly Status<unknown>[]): number {
  let more = 0;
  for (const { pen } of on) more += pen ?? 0;
  return more;
}

/** What these add to a bearer's ATK (a share), or to its ATK Spd, Tough, ACC or crit chance (points). */
export function adding(on: readonly Status<unknown>[], key: 'atk' | 'speed' | 'tough' | 'acc' | 'critPoints'): number {
  let more = 0;
  for (const status of on) more += status[key] ?? 0;
  return more;
}

/** What these add to a bearer's CC ACC (points). */
export function accurate(on: readonly Status<unknown>[]): number {
  let more = 0;
  for (const { accuracy } of on) more += accuracy ?? 0;
  return more;
}

/** What these add to a bearer's CC resist (points). */
export function resisting(on: readonly Status<unknown>[]): number {
  let more = 0;
  for (const { resist } of on) more += resist ?? 0;
  return more;
}

/** What these add to how likely the blows on a bearer are to be critical (points). */
export function critTaking(on: readonly Status<unknown>[], type: DamageType): number {
  let more = 0;
  for (const { critTaken } of on) more += typeof critTaken === 'number' ? critTaken : (critTaken?.[type] ?? 0);
  return more;
}

/** What these take off how likely a kind of damage's blows on a bearer are to be critical (points). */
export function critResisting(on: readonly Status<unknown>[], type: DamageType): number {
  let more = 0;
  for (const { critResist } of on) more += typeof critResist === 'number' ? critResist : (critResist?.[type] ?? 0);
  return more;
}

/** How many times as much defense against a kind of damage a bearer of these has. */
export const defending = (on: readonly Status<unknown>[], type: DamageType): number => stacked(defends(on, type));

/** What these add to a bearer's defense against a kind of damage. */
export function bolstering(on: readonly Status<unknown>[], type: DamageType): number {
  let more = 0;
  for (const { bolsters } of on) more += bolsters?.[type] ?? 0;
  return more;
}

/** What these add to a bearer's chance to dodge a kind of damage (points). */
export function dodging(on: readonly Status<unknown>[], type: DamageType): number {
  let more = 0;
  for (const { dodges } of on) more += dodges?.[type] ?? 0;
  return more;
}

/** What these add to a bearer's chance to block a kind of damage (points). */
export function blocking(on: readonly Status<unknown>[], type: DamageType): number {
  let more = 0;
  for (const { blocks } of on) more += blocks?.[type] ?? 0;
  return more;
}

/** A bearer of these can do nothing; is out of the fight altogether. */
export const bound = (on: readonly Status<unknown>[]): boolean => on.some((status) => status.binds || status.away);
export const away = (on: readonly Status<unknown>[]): boolean => on.some((status) => status.away);
export const sealed = (on: readonly Status<unknown>[]): boolean => on.some((status) => status.seals);
