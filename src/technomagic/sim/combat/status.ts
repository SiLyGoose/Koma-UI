import type { DamageType } from './damage';

/*
 * What a skill leaves on a fighter for a while: the boss easier to hurt or hitting less hard, the heroes
 * taking less. Each changes what its bearer takes (of every kind of damage, or of some), how hard it
 * hits, how much healing and mana reach it, or whether it can act at all, until it runs out.
 */

/** `shown` is how the page shows it: a mark under the boss's health, a square on a hero's card. */
export interface Status<Shown> {
  name: string;
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
  /** Added to its bearer's penetration (points). */
  pen?: number;
  /** Its bearer's defense is this many times as much: against every kind, or against each kind it names. */
  defends?: number | Partial<Record<DamageType, number>>;
  /** Added to a hero bearing it's defense against each kind it names (before what makes it so many times as much). */
  bolsters?: Partial<Record<DamageType, number>>;
  /** Added to its bearer's chance to block each kind it names (points). */
  blocks?: Partial<Record<DamageType, number>>;
  /** Added to its bearer's CC resist (points); and to a hero bearing it's CC ACC (points: what of the boss's CC resist its stuns see past). */
  resist?: number;
  accuracy?: number;
  /** Added to how likely the blows on its bearer are to be critical (points: of every kind, or of each kind it names): the boss's Crit Resistance lowered. */
  critTaken?: number | Partial<Record<DamageType, number>>;
  /** Taken off how likely the blows on its bearer are to be critical (points): of every kind, or of each kind it names. */
  critResist?: number | Partial<Record<DamageType, number>>;
  /** Its bearer can do nothing while it is on (knocked down); and is out of the fight altogether, not to be aimed at (imprisoned). */
  binds?: boolean;
  away?: boolean;
  /** Its bearer can't be knocked down while it is on. */
  guards?: boolean;
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

/** How many times as much of a kind of damage a bearer of these takes. */
export function taking(on: readonly Status<unknown>[], type: DamageType): number {
  let times = 1;
  for (const { takes } of on) times *= typeof takes === 'number' ? takes : (takes?.[type] ?? 1);
  return times;
}

/** How many times as hard a bearer of these hits. */
export function dealing(on: readonly Status<unknown>[]): number {
  let times = 1;
  for (const { deals } of on) times *= deals ?? 1;
  return times;
}

/** How many times as fast a bearer of these is. */
export function pacing(on: readonly Status<unknown>[]): number {
  let times = 1;
  for (const { pace } of on) times *= pace ?? 1;
  return times;
}

/** How many times as much healing reaches a bearer of these. */
export function healing(on: readonly Status<unknown>[]): number {
  let times = 1;
  for (const { heals } of on) times *= heals ?? 1;
  return times;
}

/** How many times as fast a bearer of these gains mana. */
export function filling(on: readonly Status<unknown>[]): number {
  let times = 1;
  for (const { mana } of on) times *= mana ?? 1;
  return times;
}

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
export function defending(on: readonly Status<unknown>[], type: DamageType): number {
  let times = 1;
  for (const { defends } of on) times *= typeof defends === 'number' ? defends : (defends?.[type] ?? 1);
  return times;
}

/** What these add to a bearer's defense against a kind of damage. */
export function bolstering(on: readonly Status<unknown>[], type: DamageType): number {
  let more = 0;
  for (const { bolsters } of on) more += bolsters?.[type] ?? 0;
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
