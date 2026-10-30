import type { BossDef, BossPart } from './bosses/boss';
import type { DamageType, HeroStats, PerKind } from './combat/damage';
import type { Status } from './combat/status';
import type { Ability, HeroDef, HeroPart } from './heroes/kit';
import type { HeroMove } from './heroes/moves';
import type { Motion } from './motion';
import type { ArtifactDef } from './artifacts';
import type { SetEffect, TmSet } from './sets';
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
  | 'dodgePhysical'
  | 'dodgeMagical'
  | 'tough'
  | 'toughPhysical'
  | 'toughMagical'
  | 'resist'
  | 'accuracy'
  | 'acc'
  | 'lifesteal'
  | 'critResist'
  | 'critResistPhysical'
  | 'critResistMagical'
  | 'heal'
  | 'recovery'
  | 'control'
  | 'manaAttack'
  | 'manaRegen'
  | 'manaDamage';
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
  /** Shares more: of the healing that reaches it (its gear's Recovery), and of the mana it gains as it loses health (its gear's). */
  readonly recovery: number;
  readonly manaDamage: number;
  /** The mana it gains as each part of its attack lands, and recovers a second (its own: ./heroes/kr.ts, with what its gear adds). */
  readonly manaPerAttack: number;
  readonly manaRegen: number;
  /** The TechnoMagic set whose effect it has, and what it does for its class (./sets.ts); null: none. And which of its effects that come once have come. */
  readonly set: { id: TmSet; effect: SetEffect } | null;
  readonly setDone: { wind: boolean; full: boolean };
  /** Its artifact (./artifacts.ts): which, what it does, at which tier (R1 to R5); null: none, or one the fight has no use for. */
  readonly artifact: { id: string; def: ArtifactDef; tier: number } | null;
  /** Its own unique weapon, as far as it is refined (1 to 5: ./unique.ts), and how many skills it has used with it; null: none. */
  readonly unique: { tier: number; casts: number } | null;
  /** Its main unique treasure (../treasures.ts): which of its four (0 to 3), at which tier; null: none. Its effect is among its perks (as 'ut'). */
  readonly treasure: { index: number; tier: number } | null;
  /**
   * The additional skills of the TechnoMagic gear it wears (./skills.ts): how many of each; what its own count
   * up (Momentum's stacks and Steadfast's); and seconds until each that waits between times may again.
   */
  readonly skills: Readonly<Partial<Record<SkillId, number>>>;
  readonly stacks: { momentum: number; steadfast: number; bloodlust: number; bulwark: number };
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
  /** Whether the skill reserved is its Auto's pick (not one pressed); and how long since its Auto last looked for one (or it last used a skill). */
  autoPicked: boolean;
  autoWait: number;
  /** How long it has been free (on the field). */
  rested: number;
  /**
   * This fight: what its blows have taken of the boss, what its heals have given the heroes and its shields put on them;
   * what of the blows on it its defense took off (its DEF, a block, less damage taken, and the whole of one dodged), and what was left of them (on its shield or its health).
   */
  dealt: number;
  healed: number;
  shielded: number;
  mitigated: number;
  taken: number;
  doing: Doing | null;
  /** How many times as fast everything it does goes, this step (its attack speed, and what is on it). */
  haste: number;
  /** Where it stands on the field (along it, toward the camera): moving toward its spot in its line. */
  x: number;
  z: number;
}

/** What there is to know of an enemy: what it is known by, and its stats (a boss's: BossDef; a minion's, at its wave's stage). */
export type FoeDef = Pick<BossDef, 'id' | 'name' | 'stats'>;

/** An enemy in the fight: the boss, or a minion of a wave of its raid (./bosses/dragon/minions.ts). */
export interface Foe {
  /** Its place among the enemies (the boss is 0; minions after it, as they come). */
  readonly index: number;
  /** 'boss', or the minion's kind. */
  readonly kind: string;
  readonly def: FoeDef;
  /** What its skills do beyond hurting whoever they land on. */
  part: BossPart;
  hp: number;
  /** Its health whole (its own, or less for a raid fought alone; more once a skill of its has it so: Siegfried's Divine Power). */
  maxHp: number;
  /** How long it is stunned for yet, and its attacks slowed (to `slowRate` of their speed). */
  stunned: number;
  slowed: number;
  slowRate: number;
  /** What the heroes' skills have left on it for a while. */
  statuses: Status<Tone>[];
  /** Where it stands on the field (along it, toward the camera). */
  x: number;
  z: number;
  /** Off the field for now (the boss flown off between waves), or beaten: no blow reaches it. */
  away: boolean;
}

/** What a hero's part, or the boss's, can ask of the fight. */
export interface Fight {
  readonly fighters: readonly Fighter[];
  /** The heroes on the field, in the order they came onto it (there may be none). */
  readonly field: readonly Fighter[];
  /**
   * The enemy in question: as a hero's move lands (or what it has to do with anything), the one it is fighting; as a blow
   * lands, the one it lands on; as an enemy's own move goes, that one; and otherwise the boss (or, while it is away, the
   * first minion standing).
   */
  readonly foe: Foe;
  /** The boss; and every enemy that has come onto the field, the boss first, beaten or not. */
  readonly boss: Foe;
  readonly foes: readonly Foe[];
  /** The wave of its raid the fight is on (1 to `waves`), and how many it has. */
  readonly wave: number;
  readonly waves: number;
  /** What is on every hero for a while. */
  readonly party: Status<Buff>[];
  /** The raid's stage (1 to the boss's last: stagesOf). */
  readonly stage: number;
  /** The fight's chances: a number from 0 up to 1 (./random.ts). Nothing in it is to use Math.random. */
  roll(): number;
  /** `run` with `foe` the enemy in question (`foe`): what it hits, stuns or leaves something on is that one. */
  on<T>(foe: Foe, run: () => T): T;
  /**
   * A hero's blow lands on the boss: `amount` in thousandths of the hero's ATK, as the game's shares have them (./combat/damage.ts), before the hero's own attack, its passive
   * and the boss's defense against the kind of damage it deals (seen past by its penetration, and `pierce`
   * points more). One that is `counted` is told to every hero's part, and the boss's (not what comes of a status already on the boss).
   * Returns whether it landed, and was critical. One `whole` goes through all the boss's defense.
   */
  hit(by: Fighter, amount: number, counted?: boolean, pierce?: number, whole?: boolean): boolean;
  /** A blow of continuous DMG (King's Raid's: a Poison's, a Bleed's, a Flame's every second), as `hit`'s not counted: the harder for its hero's Corrosion. */
  continuous(by: Fighter, amount: number): boolean;
  /** The blow of a hero's attack landing now, as King's Raid's playtest has it (thousandths of ATK: ./heroes/kr.ts); 0 while none is. */
  readonly basic: number;
  /**
   * A hero is given back `amount` of its health (not while it is down), less what is on it and the boss's skills take off;
   * `by` is the hero whose heal it is (it gives as much more as its attack is over ATK, or less), or `from`, for a heal
   * that isn't by its ATK (a share of max HP or DEF, or of damage dealt): either way, what it gives is counted as theirs
   * (its healing done, HPS). How much it was given.
   */
  heal(fighter: Fighter, amount: number, by?: Fighter, from?: Fighter): number;
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
  hurt(fighter: Fighter, amount: number, blockable?: boolean, kind?: DamageType): number;
  /** A hero is knocked down: what it was doing is cut short, and it can do nothing for so many seconds (fewer for its CC resist). */
  knock(fighter: Fighter, seconds: number): void;
  /** What a hero was doing is cut short (it reels a moment). */
  stagger(fighter: Fighter): void;
  /** A hero down is up again, with `share` of its health (a skill that revives: nothing else does). */
  revive(fighter: Fighter, share: number, by?: Fighter): void;
  /** The boss is given back `amount` of its health, as much more or less as what is on it and `more` (its own healing, added up with what is on it) say (not while it is beaten). */
  mend(amount: number, ...more: number[]): void;
  /** The boss is stunned (or knocked `down`): for longer when it is `by` a hero's skill and its passive and gear say so. */
  stun(seconds: number, how?: { down?: boolean; by?: Fighter }): void;
  /** The boss's ATK Spd is so many points lower (King's Raid's: 300 has it attack at 70% of its speed) for so many seconds. */
  slow(points: number, seconds: number): void;
  /**
   * The boss's skills' cooldowns are so many seconds longer (King's Raid's ModActiveCooltime: Shamilla's Curse of Time), a
   * skill ready as much as one not: as its part keeps them (BossPart.delay); a minion's, its skill's.
   */
  delay(seconds: number): void;
  /**
   * The boss begins `attack` now, whatever it was doing (that cut short, and a stun or a fall on it over), on Auto or not:
   * a skill of its own that comes of itself (Siegfried's Divine Power, as it would be beaten).
   */
  force(attack: string): void;
  /** Something for the page to draw that the fight's own events don't say: `name` is the hero's (or with `who` null, the boss's) own, and `targets` whom it is on. */
  cue(who: Fighter | null, name: string, targets?: readonly Fighter[]): void;
}
