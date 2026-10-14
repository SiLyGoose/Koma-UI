import type { BossDef, BossPart } from '../bosses/boss';
import type { HeroStats } from '../combat/damage';
import type { Status } from '../combat/status';
import type { Tone } from '../hud/boss-bar';
import type { Buff } from '../hud/buff';
import type { HeroDef, HeroPart } from '../heroes/kit';
import type { HeroMove } from '../heroes/moves';
import type { Motion } from './motion';
import type { SetRole, TmSet } from './sets';

/*
 * Who is in the fight, as the sim keeps them (./fight.ts), and what a hero's or a boss's part in it may
 * ask of the fight (Fight). Nothing here is drawn: the page draws what the sim says happened (./events.ts).
 */

/**
 * What a hero's gear gives it, as the bot counts it: points added to a chance or share (crit, attack speed,
 * penetration, block, dodge, CC resist: 1000 is 100%), and a share more of its own for the rest (ATK, HP,
 * crit damage, defence, heals and shields, stun duration: 0.25 is 25% more).
 */
export type GearStat = 'atk' | 'hp' | 'crit' | 'critDamage' | 'speed' | 'pen' | 'defense' | 'block' | 'dodge' | 'resist' | 'heal' | 'control';
export type GearBonus = Partial<Record<GearStat, number>>;

/** What a hero is doing besides standing: running in, a move (`part` of its animations, `t` seconds into it; the blows that have landed), or reeling from being knocked about. */
export interface Doing {
  move: HeroMove | 'hit' | 'enter';
  t: number;
  part: number;
  landed: number;
  blows: number;
}

/** A hero in the fight: one of a hero's skins. */
export interface Fighter {
  /** Its place among the fighters (what the page's inputs name it by). */
  readonly index: number;
  /** Its hero's id (../heroes/), and its skin's name: what it is known by on the page. */
  readonly id: string;
  readonly name: string;
  readonly def: HeroDef;
  /** Its stats: its hero's, with what its gear gives it. And how many times as hard a critical blow is, as much its heals and shields give, and as long its stuns last. */
  readonly stats: HeroStats;
  readonly critTimes: number;
  readonly healTimes: number;
  readonly controlTimes: number;
  /** The TechnoMagic set whose effect it has, and what its class is to it (./sets.ts); null: none. */
  readonly set: { id: TmSet; role: SetRole } | null;
  /** How long each of its moves takes and when its blows land, by its skin (./motion.ts); and the move it attacks with. */
  readonly motion: Motion;
  readonly attack: HeroMove;
  /** What comes of what it does, and what it keeps count of (the fight gives it its part as it begins). */
  part: HeroPart;
  hp: number;
  /** What a shield on it takes of the boss's blows before its health does (0: none), and for how many seconds yet. */
  shield: number;
  shieldLeft: number;
  /** What another hero's skill (or the boss's) has left on it alone for a while (what is on every hero is the fight's). */
  statuses: Status<Buff>[];
  mana: number;
  /** Its skills are used for it. */
  auto: boolean;
  /** Seconds until each of its skills can be used again. */
  cooldowns: number[];
  /** The skill it will use as soon as it is free. */
  reserved: number | null;
  /** How long it has been free (on the field). */
  rested: number;
  /** What its blows have taken of the boss this fight, and what its heals and shields have given the heroes. */
  dealt: number;
  healed: number;
  doing: Doing | null;
  /** How many times as fast everything it does goes, this step (its attack speed, and what is on it). */
  haste: number;
  /** Where it stands on the field (along it, toward the camera): moving toward its spot in its line. */
  x: number;
  z: number;
}

/** The boss in the fight. */
export interface Foe {
  readonly def: BossDef;
  /** What its skills do beyond hurting whoever they land on. */
  part: BossPart;
  hp: number;
  /** Its health whole (its own, or less for a raid fought alone). */
  readonly maxHp: number;
  /** How long it is stunned for yet, and its attacks slowed (to `slowRate` of their speed). */
  stunned: number;
  slowed: number;
  slowRate: number;
  /** What the heroes' skills have left on it for a while. */
  statuses: Status<Tone>[];
}

/** What a hero's part, or the boss's, can ask of the fight. */
export interface Fight {
  readonly fighters: readonly Fighter[];
  /** The heroes on the field, in the order they came onto it (there may be none). */
  readonly field: readonly Fighter[];
  readonly foe: Foe;
  /** What is on every hero for a while. */
  readonly party: Status<Buff>[];
  /** The raid's stage (1 to STAGES). */
  readonly stage: number;
  /** The fight's chances: a number from 0 up to 1 (./random.ts). Nothing in it is to use Math.random. */
  roll(): number;
  /**
   * A hero's blow lands on the boss: `amount` at an ATK of 1000, before the hero's own attack, its passive
   * and the boss's defence against the kind of damage it deals (seen past by its penetration, and `pierce`
   * points more). One that is `counted` is told to every hero's part, and the boss's (not what comes of a status already on the boss).
   */
  hit(by: Fighter, amount: number, counted?: boolean, pierce?: number): void;
  /** A hero is given back `amount` of its health (not while it is down), less what is on it and the boss's skills take off; `by` is the hero whose heal it is (it gives as much more as its attack is over 1000, or less). */
  heal(fighter: Fighter, amount: number, by?: Fighter): void;
  /**
   * A hero is given a shield of `amount` (on top of any it has) for so many `seconds` (for good, when it
   * doesn't say): the boss's blows wear it away before its health (not while it is down). `by` is the hero whose shield it is (by its attack, as a heal).
   */
  shield(fighter: Fighter, amount: number, seconds?: number, by?: Fighter): void;
  /** The hero the boss is going for (null: there is no one it can). */
  target(): Fighter | null;
  /**
   * A blow of the boss's lands on a hero: `amount` before what is on the boss, the hero's defence against
   * the boss's kind of damage, and a dodge or a block (`blockable`, unless it says not: then it can be neither). Returns what it took.
   */
  hurt(fighter: Fighter, amount: number, blockable?: boolean): number;
  /** A hero is knocked down: what it was doing is cut short, and it can do nothing for so many seconds (fewer for its CC resist). */
  knock(fighter: Fighter, seconds: number): void;
  /** What a hero was doing is cut short (it reels a moment). */
  stagger(fighter: Fighter): void;
  /** A hero down is up again, with `share` of its health (a skill that revives: nothing else does). */
  revive(fighter: Fighter, share: number, by?: Fighter): void;
  /** The boss is given back `amount` of its health, less what is on it (not while it is beaten). */
  mend(amount: number): void;
  /** The boss is stunned (or knocked `down`): for longer when it is `by` a hero's skill and its passive and gear say so. */
  stun(seconds: number, how?: { down?: boolean; by?: Fighter }): void;
  /** The boss's attacks go at `rate` of their speed for so many seconds. */
  slow(rate: number, seconds: number): void;
  /** Something for the page to draw that the fight's own events don't say: `name` is the hero's (or with `who` null, the boss's) own, and `targets` whom it is on. */
  cue(who: Fighter | null, name: string, targets?: readonly Fighter[]): void;
}
