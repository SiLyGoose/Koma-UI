import { HERO_LEVEL, type BossStats, type DamageType } from '../combat/damage';
import type { Mark } from '../shown';
import type { WaveMinion } from './dragon/waves';
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
  /** Its skills' cooldowns are so many seconds longer, a skill ready as much as one not (a hero's: Fight.delay). None said: nothing delays them. */
  delay?(seconds: number): void;
  /** What it has going for it that only it keeps count of: marks under its health. */
  marks?(): Mark[];
  /** How full its CC gauge is (0 to 1), for the bar under its health (none said: it has none). */
  gauge?(): number;
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
   */
  waves?: { at(stage: number): readonly (readonly WaveMinion[])[]; party?: number; leaves: number; lands: { share: number; blow?: number; knock: number } };
  /** Its part in a fight, when its skills do more than hurt whoever they land on: made once, as the fight begins. */
  join?(fight: Fight): BossPart;
  /**
   * Its Normal mode (a Dragon Raid's dragon: King's Raid's Normal Dragon Raid), the same boss with its own stats, stages,
   * waves and part; it is then its Hard mode. None: it has only the one.
   */
  normal?: BossDef;
}
