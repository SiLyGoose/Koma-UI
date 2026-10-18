import type { BossDef, BossPart } from './bosses/boss';
import type { HeroStats, PerKind } from './combat/damage';
import type { Status } from './combat/status';
import type { Ability, HeroDef, HeroPart } from './heroes/kit';
import type { HeroMove } from './heroes/moves';
import type { Motion } from './motion';
import type { SetRole, TmSet } from './sets';
import type { Buff, Tone } from './shown';
import type { PerkDef, SkillMark } from './perks';
import type { SkillId } from './skills';

/*
 * Who is in the fight, as the sim keeps them (./fight.ts), and what a hero's or a boss's part in it may
 * ask of the fight (Fight). Nothing here is drawn: the page draws what the sim says happened (./events.ts).
 */

/**
 * What a hero's gear gives it, as the bot counts it: points added to a chance or share (crit, attack speed,
 * penetration, block, block DEF, dodge, Tough, CC resist, accuracy, lifesteal, crit resist: 1000 is 100%), ATK added
 * as it is (`atkFlat`: a unique weapon's), HP added as it is (`hpFlat`: a main unique treasure's, and TechnoMagic weapons' main stat), P.DEF and M.DEF
 * added as they are (`defPhysicalFlat`, `defMagicalFlat`: TechnoMagic armors' main stat), and a share more of its own for the rest (ATK, HP, crit damage, defense,
 * heals and shields, stun duration, mana per attack, mana recovery: 0.25 is 25% more). `defense`, `block`, `blockDef`,
 * `tough` and `critResist` are against both kinds of damage; the ones ending in Physical or Magical against that kind only.
 */
export type GearStat =
  | 'atk'
  | 'atkFlat'
  | 'hp'
  | 'hpFlat'
  | 'crit'
  | 'critDamage'
  | 'speed'
  | 'pen'
  | 'defense'
  | 'defPhysical'
  | 'defMagical'
  | 'defPhysicalFlat'
  | 'defMagicalFlat'
  | 'block'
  | 'blockPhysical'
  | 'blockMagical'
  | 'blockDef'
  | 'blockDefPhysical'
  | 'blockDefMagical'
  | 'dodge'
  | 'tough'
  | 'toughPhysical'
  | 'toughMagical'
  | 'resist'
  | 'accuracy'
  | 'lifesteal'
  | 'critResist'
  | 'critResistPhysical'
  | 'critResistMagical'
  | 'heal'
  | 'control'
  | 'manaAttack'
  | 'manaRegen';
export type GearBonus = Partial<Record<GearStat, number>>;

/** What a hero is doing besides standing: running in, a move (`part` of its animations, `t` seconds into it; the blows that have landed), or reeling from being knocked about. */
export interface Doing {
  move: HeroMove | 'hit' | 'enter';
  /** A skill: which of its slots it is. */
  skill?: number;
  t: number;
  part: number;
  landed: number;
  blows: number;
}

/** A hero in the fight, in one of its skins. */
export interface Fighter {
  /** Its place among the fighters (what the page's inputs name it by). */
  readonly index: number;
  /** Its hero's id (./heroes/), and its skin's name: what it is known by on the page. */
  readonly id: string;
  readonly name: string;
  readonly def: HeroDef;
  /** Its transcendence perks (./perks.ts): their ids, and what each does. */
  readonly perks: ReadonlySet<string>;
  readonly perkDefs: readonly PerkDef[];
  /** Its skills, as its perks change them (what each costs, and how long before it can be used again). */
  readonly abilities: readonly Ability[];
  /**
   * Its perks' DMG: how many times as hard its skills' blows are (by the move each skill is), how many times as much
   * every blow of its deals the boss, and what the boss's blows take of it (of each kind).
   */
  readonly moveDmg: Partial<Record<HeroMove, number>>;
  /** Its skills' moves whose blows go through all the boss's defense, and what each leaves on the boss as its first blow lands (its perks'). */
  readonly moveWhole: ReadonlySet<HeroMove>;
  readonly moveMarks: Partial<Record<HeroMove, readonly SkillMark[]>>;
  /** How many times as much its skills' heals and shields give (by the move each skill is: its perks', its main treasure's). */
  readonly moveHeals: Partial<Record<HeroMove, number>>;
  readonly perkDmg: number;
  readonly perkTaken: PerKind;
  /** ACC (points): what of the boss's dodge and block its blows see past (its class's, and its perks'). */
  readonly acc: number;
  /** Seconds until each of its perks that waits between times may again (by its name); the boss's blows it is immune to yet (Deception); Swift and Nimble's stacks; how long its Mortal Wound on the boss lasts yet. */
  readonly perkWaits: Record<string, number>;
  immune: number;
  nimble: number;
  wound: number;
  /** Its stats: its hero's, with what its gear gives it. And how many times as hard a critical blow is, as much its heals and shields give, and as long its stuns last. */
  readonly stats: HeroStats;
  readonly critTimes: number;
  readonly healTimes: number;
  readonly controlTimes: number;
  /** Points: what of the boss's CC resist it sees past and the share of what it deals that heals it (its gear's), and what it takes off the boss's crit chance against each kind of damage (its gear's). */
  readonly accuracy: number;
  readonly lifesteal: number;
  readonly critResist: PerKind;
  /** The mana it gains as each part of its attack lands, and recovers a second (its own: ./heroes/kr.ts, with what its gear adds). */
  readonly manaPerAttack: number;
  readonly manaRegen: number;
  /** The TechnoMagic set whose effect it has, and what its class is to it (./sets.ts); null: none. */
  readonly set: { id: TmSet; role: SetRole } | null;
  /** Its own unique weapon, as far as it is refined (1 to 5: ./unique.ts), and how many skills it has used with it; null: none. */
  readonly unique: { tier: number; casts: number } | null;
  /** Its main unique treasure (../treasures.ts): which of its four (0 to 3), at which tier; null: none. Its effect is among its perks (as 'ut'). */
  readonly treasure: { index: number; tier: number } | null;
  /**
   * The additional skills of the TechnoMagic gear it wears (./skills.ts): how many of each; what its own count
   * up (Momentum's stacks and Steadfast's); and seconds until each that waits between times may again.
   */
  readonly skills: Readonly<Partial<Record<SkillId, number>>>;
  readonly stacks: { momentum: number; steadfast: number };
  readonly waits: Partial<Record<SkillId, number>>;
  /** How long each of its moves takes and when its blows land (./motion.ts); and the move it attacks with. */
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
  /** In the Sub Team (a raid fought alone): on Auto for the whole fight, with no card of its own. */
  readonly sub: boolean;
  /** Its skills are used for it. */
  auto: boolean;
  /** Seconds until each of its skills can be used again. */
  cooldowns: number[];
  /** The skill it will use as soon as it is free and has the mana for it (one at a time). */
  reserved: number | null;
  /** The mana it has gained a second lately (counted over AUTO.income seconds): how soon its Auto will have a skill's. */
  income: number;
  /** How far into the fight it last used each of its skills (-Infinity: not yet): its Auto goes for the one it has gone longest without. */
  lastUsed: number[];
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
  /** The raid's stage (1 to the boss's last: stagesOf). */
  readonly stage: number;
  /** The fight's chances: a number from 0 up to 1 (./random.ts). Nothing in it is to use Math.random. */
  roll(): number;
  /**
   * A hero's blow lands on the boss: `amount` in thousandths of the hero's ATK, as the game's shares have them (./combat/damage.ts), before the hero's own attack, its passive
   * and the boss's defense against the kind of damage it deals (seen past by its penetration, and `pierce`
   * points more). One that is `counted` is told to every hero's part, and the boss's (not what comes of a status already on the boss).
   * Returns whether it landed, and was critical. One `whole` goes through all the boss's defense.
   */
  hit(by: Fighter, amount: number, counted?: boolean, pierce?: number, whole?: boolean): boolean;
  /** The blow of a hero's attack landing now, as King's Raid's playtest has it (thousandths of ATK: ./heroes/kr.ts); 0 while none is. */
  readonly basic: number;
  /** A hero is given back `amount` of its health (not while it is down), less what is on it and the boss's skills take off; `by` is the hero whose heal it is (it gives as much more as its attack is over ATK, or less). */
  heal(fighter: Fighter, amount: number, by?: Fighter): void;
  /**
   * A hero is given a shield of `amount` (on top of any it has) for so many `seconds` (for good, when it
   * doesn't say): the boss's blows wear it away before its health (not while it is down). `by` is the hero whose shield it is (by its attack, as a heal).
   */
  shield(fighter: Fighter, amount: number, seconds?: number, by?: Fighter): void;
  /** The hero the boss is going for (null: there is no one it can). */
  target(): Fighter | null;
  /**
   * A blow of the boss's lands on a hero: `amount` before what is on the boss, the hero's defense against
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
  /** The boss's ATK Spd is so many points lower (King's Raid's: 300 has it attack at 70% of its speed) for so many seconds. */
  slow(points: number, seconds: number): void;
  /** Something for the page to draw that the fight's own events don't say: `name` is the hero's (or with `who` null, the boss's) own, and `targets` whom it is on. */
  cue(who: Fighter | null, name: string, targets?: readonly Fighter[]): void;
}
