import type { BossStats } from '../combat/damage';
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
  /** A hero's blow has landed on it, taking `dealt` (not one that comes of a status already on it). */
  struck?(by: Fighter, dealt: number): void;
  /** It has been beaten. */
  beaten?(): void;
  /** How many times as much healing reaches the heroes, and how many times as strong a shield on one is. */
  healing?(): number;
  shielding?(): number;
  /** Nothing slows its attacks. */
  steady?: boolean;
  /** What it has going for it that only it keeps count of: marks under its health. */
  marks?(): Mark[];
}

export interface BossDef {
  /** What the bot and the site know it by. */
  id: string;
  name: string;
  /** Its health, the kind of damage its blows deal, how it stands the heroes', and its crits and CC resist. */
  stats: BossStats;
  /** Its attacks; how each goes (`plans`, by its name), and the moves they are made of (`moves`). */
  attacks: readonly BossAttack[];
  plans: Readonly<Record<string, Plan>>;
  moves: Readonly<Record<string, BossMove>>;
  /** Its part in a fight, when its skills do more than hurt whoever they land on: made once, as the fight begins. */
  join?(fight: Fight): BossPart;
}
