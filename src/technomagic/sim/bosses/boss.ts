import type { BossStats, DamageType } from '../combat/damage';
import type { Mark } from '../shown';
import type { Fight, Fighter } from '../types';

/*
 * A boss, whichever it is, as the fight has it: what there is to know of it (BossDef: its stats, its attacks and how
 * each goes), and what its skills do in a fight (BossPart). Each boss is a folder here; ./index.ts lists them. Its body
 * on the field, drawn as the fight says, is the page's (../../bosses/).
 */

/** An attack a boss can be set to, by hand when trying things out (its button says `label`) or by Boss auto. */
export interface BossAttack {
  name: string;
  label: string;
}

/** One move of a part of the boss (a head's): how long it takes, when in it its blow lands (null: none), and what that takes, least to most, before its target's defense. */
export interface BossMove {
  length: number;
  hit: number | null;
  hurts?: readonly [number, number];
}

/**
 * An attack, as its parts move: each of `move`, by a part of the boss (`by`: a head), `after` seconds after
 * that part's move before it ended (its first: after the attack began). A part with two goes on to its second
 * once its first is done.
 */
export type Plan = readonly (readonly [move: string, by: string, after: number])[];

/** A boss's part in one fight: what comes of its attacks as they land, and what it keeps count of meanwhile. */
export interface BossPart {
  /** What comes of each blow of an attack as it lands, by the attack's name (one it doesn't name: the blow lands on whoever it is going for). */
  lands: Partial<Record<string, (part: number, amount: number) => void>>;
  /** Every step. */
  tick?(dt: number): void;
  /** A hero's blow has landed on it, taking `dealt` (not one that comes of a status already on it); and whether it was a critical blow. */
  struck?(by: Fighter, dealt: number, critical: boolean): void;
  /**
   * A stun of so many seconds is put on it (knocked `down`, or not), already as short as its CC resist has it: what holds it
   * instead (null, or no seconds: nothing does; a dragon's CC gauge has taken it). None said: as it comes.
   */
  controlled?(seconds: number, down: boolean): { seconds: number; down: boolean } | null;
  /** It has been beaten. */
  beaten?(): void;
  /** How many times as much healing reaches the heroes, and how many times as strong a shield on one is. */
  healing?(): number;
  shielding?(): number;
  /** Nothing slows its attacks. */
  steady?: boolean;
  /** How many times as much it takes of each kind of damage (none said: as much as it is dealt). */
  taken?: Partial<Record<DamageType, number>>;
  /** Taken off how likely a hero's blow on it is to be critical (points): its Crit Resistance. */
  critResist?: number;
  /** No hero's life steal takes anything from it. */
  unstolen?: boolean;
  /** It has begun an attack, by its name. */
  used?(attack: string): void;
  /** Boss auto: an attack it must use next, before any other (null: none); and whether it may pick an attack now (none said: any, always). */
  next?(): string | null;
  ready?(attack: string): boolean;
  /** What it has going for it that only it keeps count of: marks under its health. */
  marks?(): Mark[];
}

/** At a stage: so many times a boss's health, so many times as hard its blows, and so many times its defenses (none said: its own). */
export interface BossScale {
  hp: number;
  deals: number;
  defense?: number;
}

/** A boss's scale at `stage` (1 to its last; past it, its last), alone or not. */
export function scaleAt(def: BossDef, stage: number, solo: boolean): BossScale {
  const row = solo ? def.stages.solo : def.stages.room;
  return row[Math.min(row.length, Math.max(1, Math.floor(stage) || 1)) - 1] ?? { hp: 1, deals: 1 };
}

export interface BossDef {
  /** What the bot and the site know it by. */
  id: string;
  name: string;
  /** Its health, the kind of damage its blows deal, how it stands the heroes', and its crits and CC resist. */
  stats: BossStats;
  /**
   * How much tougher it is at each stage (the first is stage 1's), fought with more than one player and alone: so
   * many times its health, and so many times as hard its blows.
   */
  stages: { room: readonly BossScale[]; solo: readonly BossScale[] };
  /** Its attacks; how each goes (`plans`, by its name), and the moves they are made of (`moves`). */
  attacks: readonly BossAttack[];
  plans: Readonly<Record<string, Plan>>;
  moves: Readonly<Record<string, BossMove>>;
  /** Its part in a fight, when its skills do more than hurt whoever they land on: made once, as the fight begins. */
  join?(fight: Fight): BossPart;
}
