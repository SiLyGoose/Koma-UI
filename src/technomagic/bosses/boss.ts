import type { Group, Vector3 } from 'three';
import type { BossAssets } from '../assets';
import type { Stats } from '../combat/damage';
import type { Mark } from '../hud/boss-bar';
import type { Fight, Fighter } from '../sim/types';

/*
 * A boss, whichever it is: what there is to know of it (BossDef: its stats, its attacks and how each goes),
 * what its skills do in a fight (BossPart: the sim's, ../sim/), and its body on the field (Boss: the
 * page's, drawn as the sim says). Each boss is a folder here; ./index.ts lists them, ./models.ts their bodies.
 */

/** An attack a boss can be set to, by hand when trying things out (its button says `label`) or by Boss auto. */
export interface BossAttack {
  name: string;
  label: string;
}

/** One move of a part of the boss (a head's): how long it takes, when in it its blow lands (null: none), and what that takes, least to most, before its target's defence. */
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

/** The boss's body on the field: drawn doing what the sim says it does. */
export interface Boss {
  /** Where it stands on the field: put this in the scene. */
  root: Group;
  /** Begins one of its attacks (by its name). */
  use(attack: string): void;
  /** Stunned for so many seconds (or longer, if it already is): what it was doing is cut short, lower when it is knocked `down`. */
  daze(seconds: number, down?: boolean): void;
  /** Its attacks go at `rate` of their speed for so many seconds. */
  slow(rate: number, seconds: number): void;
  /** Hit: white for a moment, and shaken. */
  hit(): void;
  /** Where whoever it is fighting is, on the field (their chest): asked as it attacks, put in `into`. The page sets it. */
  target: (into: Vector3) => Vector3;
  update(now: number, dt: number): void;
}

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
  assets: BossAssets;
  /** Its health, the kind of damage its blows deal, and how it stands the heroes'. */
  stats: Stats;
  /** Where it stands along the field, and how far it is turned from side-on toward the camera. */
  stands: { x: number; turn: number };
  /** From where it stands: where a hero's cut reaches it (a little toward the camera), and the floor under it. */
  reach: { hit: readonly [number, number, number]; feet: readonly [number, number, number] };
  /** Its attacks; how each goes (`plans`, by its name), and the moves they are made of (`moves`). */
  attacks: readonly BossAttack[];
  plans: Readonly<Record<string, Plan>>;
  moves: Readonly<Record<string, BossMove>>;
  /** Its part in a fight, when its skills do more than hurt whoever they land on: made once, as the fight begins. */
  join?(fight: Fight): BossPart;
}
