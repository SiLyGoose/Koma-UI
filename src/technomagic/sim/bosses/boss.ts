import { HERO_LEVEL, type BossStats, type DamageType } from '../combat/damage';
import type { Mark } from '../shown';
import type { WaveMinion } from './dragon/waves';
import type { HeroClass } from '../heroes/kit';
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
  /** What is said across the top of the field as it begins, for so many seconds, in its colour (King's Raid's BossWarningTable: its pattern alarm). */
  warning?: Warning;
}

/**
 * A boss's pattern alarm, as King's Raid's has it: its words and their colour (the words' own colour tag), or its picture
 * ("WARNING", flown in); how long it stays (seconds), and whether its CC gauge breaking cuts it short (King's Raid's, unless
 * the table says CantCancel).
 */
export type Warning = { lasts: number; breaks?: boolean } & ({ text: string; colour: string } | { image: 'warning' });

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
  /** A blow would beat it: whether it is spared instead (left on what health it has, as King's Raid's EscapeDeath: Siegfried's Divine Power). */
  spared?(): boolean;
  /** No hero's blow hurts it for now (each says Physical Immune or Magic Immune instead: Siegfried's as he rises). */
  untouched?(): boolean;
  /** How many times its own size it is drawn now (none said: its own; Siegfried's, grown as he rises the second time). */
  size?(): number;
  /** It has been beaten. */
  beaten?(): void;
  /** A blow of its has landed on a hero (not one dodged, nor one the hero was immune to), and whether the hero blocked it. */
  landed?(on: Fighter, blocked: boolean): void;
  /** How many times as much healing reaches the heroes, and how many times as strong a shield on one is. */
  healing?(): number;
  shielding?(): number;
  /** Nothing slows its attacks. */
  steady?: boolean;
  /** How many times as much it takes of each kind of damage (none said: as much as it is dealt). */
  taken?: Partial<Record<DamageType, number>>;
  /** How many times as much a hero's attack's blows (not its skills') deal it (none said: as much as they would). */
  attackTaken?: number;
  /** Nothing lowers its DEF: what the heroes' skills leave on it to cut its defense does nothing (King's Raid's OverrideStat to its base). */
  fixedDefense?: boolean;
  /** Taken off how likely a hero's blow on it is to be critical (points): its Crit Resistance. */
  critResist?: number;
  /** No hero's life steal takes anything from it. */
  unstolen?: boolean;
  /** It has begun an attack, by its name. */
  used?(attack: string): void;
  /** Boss auto: an attack it must use next, before any other (null: none); and whether it may pick an attack now (none said: any, always). */
  next?(): string | null;
  ready?(attack: string): boolean;
  /** Its skills' cooldowns are so many seconds longer, a skill ready as much as one not (a hero's: Fight.delay). None said: nothing delays them. */
  delay?(seconds: number): void;
  /** What it has going for it that only it keeps count of: marks under its health. */
  marks?(): Mark[];
  /** How full its CC gauge is (0 to 1), for the bar under its health (none said: it has none). */
  gauge?(): number;
  /** A hero takes so much of its mana (a boss that has mana: Siegfried's; none said: it has none). */
  drain?(mana: number): void;
  /** The most a hero's blow takes of it, whatever it would have (King's Raid's SetDamage: Luciteron's Eye of Incineration, 1). None said: what it deals. */
  cap?: number;
  /** A blow on it has been held to its `cap` (King's Raid's SetDamage counting its hits down: an Ascalon beast's ward). */
  capped?(): void;
  /**
   * Nothing on it has it take more (King's Raid's OverrideStat of its Weakness to 0: Ascalon's Might of Ascalon): what the heroes
   * leave on it that raises the DMG it takes does nothing.
   */
  unweakened?: boolean;
}

/**
 * At a stage: so many times a boss's health, so many times as hard its blows, and so many times its defenses (none said: its
 * own); and its level, as King's Raid has it there (how much of a hero's defense counts against its blows: ../combat/damage.ts).
 */
export interface BossScale {
  hp: number;
  deals: number;
  defense?: number;
  level: number;
}

/** How many stages a boss has: the higher, the harder it is on the heroes (as its stages say). */
export const stagesOf = (def: BossDef): number => def.stages.room.length;

/** Which of a boss's modes a raid is against: the Dragon Raid's dragons have a Normal one besides (BossDef.normal); every boss, its Hard one (its own). */
export type BossMode = 'normal' | 'hard';

/** A boss as it is in `mode` (its Normal mode, where it has one; else, or none said, its own). */
export const bossIn = (def: BossDef, mode?: BossMode | null): BossDef => (mode === 'normal' && def.normal) || def;

/** A boss's scale at `stage` (1 to its last; past it, its last), alone or not. */
export function scaleAt(def: BossDef, stage: number, solo: boolean): BossScale {
  const row = solo ? def.stages.solo : def.stages.room;
  return row[Math.min(row.length, Math.max(1, Math.floor(stage) || 1)) - 1] ?? { hp: 1, deals: 1, level: HERO_LEVEL };
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
  /**
   * Boss auto, as King's Raid's bosses go: its attacks that are its plain attack (`basic`: one of them, at random, whenever
   * none of its skills is ready), and how long it rests after each attack (`rest`: as long as makes its plain attack take
   * the game's; none said: ../rules.ts AUTO_WAIT). Without `basic`, any it may, at random.
   */
  basic?: readonly string[];
  rest?: number;
  /** How long its raid lasts (seconds; none said: ../rules.ts RAID_TIME). */
  time?: number;
  /**
   * A raid of more than one wave (the Dragon Raid's): its waves past the first at a stage, each its minions, and how many
   * heroes King's Raid's raid is for (`party`: their health is scaled from it, as the boss's is); the share of its health it
   * leaves the field at (the first wave over: it flies off); and as it comes back for the last, what its landing takes of
   * every hero (a share of its health left, and a blow, `blow`, as its moves' are: none said, none) and how long it knocks them down.
   * (A minion with its own numbers, King's Raid's unscaled: OwnMinion.)
   * Or (`before`: Ascalon's) its waves of minions come before it: it is away as the fight begins, its first wave's minions on
   * the field, and it comes in for the last (no landing: `leaves` and `lands` say nothing). And (`perWave`) each wave has the
   * raid's whole time of its own, as King's Raid's has it (BattleInstance.GetElapsedBattleTimeMs, from the wave's start).
   */
  waves?: {
    at(stage: number): readonly (readonly WaveMinion[])[];
    party?: number;
    leaves: number;
    lands: { share: number; blow?: number; knock: number };
    before?: boolean;
    perWave?: boolean;
  };
  /**
   * Seconds of rage after its raid's time is up before the heroes have lost (none said: ../rules.ts RAGE_WIPE): King's Raid's
   * BattleDefine ExtraTime (a karma dungeon's 10).
   */
  rage?: number;
  /**
   * Won by lasting its time out with a hero standing, not by beating it (Divine Punishment's Luciteron, of which no blow takes
   * more than 1: BossPart.cap). No rage after its time.
   */
  outlast?: boolean;
  /**
   * A fight against two bosses, one after the other (Divine Punishment's Apocalypsion: Tersio, then Apocalypsion herself):
   * at `at` of its health this one is gone (King's Raid's OnHpRatio skill's Die) and `def` comes in its place, with its own
   * health, stats, attacks and part, the raid's time running on (the fight's second wave). None: it is the only one.
   */
  next?: { at: number; def: BossDef };
  /** A karma dungeon (./divine/karma.ts): waves without end, the boss and minions of each as it has them. */
  karma?: KarmaDef;
  /** Its part in a fight, when its skills do more than hurt whoever they land on: made once, as the fight begins. */
  join?(fight: Fight): BossPart;
  /**
   * Its Normal mode (a Dragon Raid's dragon: King's Raid's Normal Dragon Raid), the same boss with its own stats, stages,
   * waves and part; it is then its Hard mode. None: it has only the one.
   */
  normal?: BossDef;
}

/**
 * A karma dungeon, as King's Raid's Divine Punishment has it (./divine/karma.ts): wave after wave, without end until the raid's
 * time (and its rage) is up or the heroes are wiped, each a fresh one of its stages' monsters (its four, round and round), the
 * stronger the more waves have gone. After each wave the heroes pick one of three cards (or one is picked for them).
 */
export interface KarmaDef {
  /**
   * The `level`th wave (from 1): its boss as it is then (its own stats and part, grown for the wave), its minions and how many
   * seconds into the wave each comes, and what its boss calls up every so often while it stands (none: nothing).
   */
  wave(level: number): KarmaWave;
  /** The Karma Gauge: what the first wave is worth, and what each wave's worth is of the one before's (wave 2 on). */
  gauge: { first: number; exponent(wave: number): number };
  /** The least the gauge must reach for the run to count (King's Raid's: a Tier 1 Shard filled). */
  least: number;
  /** The most waves it is fought for: past about 30 its numbers are a wall, so this is only a bound on a run's length (../bot.ts). */
  most: number;
  /** The cards there are, and how long the heroes have to pick one (seconds; then one is picked for them). */
  cards: readonly KarmaCard[];
  pick: number;
}

/** A karma wave: its boss, its minions (each `after` seconds in), and what its boss calls up every `every` seconds while it stands. */
export interface KarmaWave {
  boss: BossDef;
  minions: readonly { minion: WaveMinion; after: number }[];
  summon?: { every: number; minions: readonly WaveMinion[] };
}

/**
 * A karma card, as King's Raid's KarmaCardTable has it: its number, its group and how likely the group is to be offered,
 * how likely it is within its group, how many times it may be taken (none said: any number), the classes it is for, King's
 * Raid's words, and what it does for every hero of them (shares: ATK more, max HP more, DMG more, mana recovery more; and its
 * skills' cooldowns so many seconds longer).
 */
export interface KarmaCard {
  id: number;
  group: number;
  groupChance: number;
  chance: number;
  most?: number;
  classes: readonly HeroClass[];
  text: string;
  does: { atk?: number; hp?: number; dmg?: number; mana?: number; cooldown?: number };
}

/**
 * A minion whose numbers are King's Raid's own (Divine Punishment's: ./divine/), not scaled to the heroes here as the Dragon
 * Raid's are (./dragon/common.ts minionOf): what it has besides a wave's minion (none said: the hard dragons' OPEN), and how
 * many times as much of each kind of damage it takes (King's Raid's DefensePower: 300 is 0.7; none said: all).
 */
export interface OwnMinion extends WaveMinion {
  own: true;
  stats?: Partial<Omit<BossStats, 'hp' | 'deals' | 'physical' | 'magical'>>;
  taken?: number;
  /** How many times its health it has in a raid fought alone (none said: as much: Divine Punishment's; Ascalon's, as he has less). */
  solo?: number;
}
