import type { Slot } from '../shared/items';

export type Stars = 1 | 2 | 3 | 4;

/** One item (the bot's web/databank.ts DatabankItem). */
export interface DatabankItem {
  id: string;
  name: string;
  stars: Stars;
  slot: Slot;
  description: string;
  /** `effects[0]` is R1. */
  effects: string[][];
  masterwork: string[] | null;
  borrowed: number | null;
  /** Where it comes from: pulled from the gacha, or only dropped by raid bosses (absent from a bot from before raid drops). */
  source?: ItemSource;
}

export type ItemSource = 'gacha' | 'raid';

/**
 * One difficulty level of the raid: what it multiplies the boss's HP and damage by, and what a win at it drops
 * for each raider (best tier first). The boss has more HP for every raider besides: `wall` (0 to 1) of its
 * DatabankBoss.hp.gear, none at level 1 and all of it from the first `gear` level, the ones built for parties
 * in raid gear. A bot from before those levels sends neither.
 */
export interface RaidLevel {
  level: number;
  hp: number;
  damage: number;
  gear?: boolean;
  wall?: number;
  drops: { stars: number; count: number }[];
}

/** One raid boss (the bot's web/models/databank.ts DatabankBoss). Its lines are Discord markdown. */
export interface DatabankBoss {
  id: string;
  name: string;
  emoji: string;
  /** Its picture (calm): its path under the bot's /api (GET). */
  picture: string;
  /**
   * Its HP at difficulty 1: `perRaider` for every raider past the first `overhead`, a party of fewer than `minRaiders`
   * counted as that many. `gear` is what it has on top for every raider (the overhead ones too) at the levels that need gear.
   */
  hp: { perRaider: number; overhead: number; minRaiders: number; gear?: number };
  phases: string[];
  moves: string[];
  /** What everyone who fought gets for beating it at difficulty 1, and how the harder levels pay more (the raid items it can drop besides go by level). */
  rewards: string;
}

/** What goes for every raid boss. */
export interface DatabankRaid {
  /** The boss gets away (and the raid is lost) if it is still standing after this many rounds. */
  maxRounds: number;
  /** Every difficulty level, from 1. */
  levels: RaidLevel[];
}

/** How a server's raid stands (the bot's /api/raid/week, for a member of it). */
export interface RaidWeek {
  /** This week's boss there. */
  boss: string;
  /** The hardest difficulty the server can pick (one past the hardest it has beaten). */
  maxDifficulty: number;
  /** When the week's raid resets (ms). */
  resetsAt: number;
}

export interface Databank {
  maxLevel: number;
  /**
   * The chance (0 to 1) a party that beats a raid boss gets raid drops, each raider finding one, before
   * what each raider adds (raidDropChancePerRaider). 0 when drops are off (absent from a bot from before raid drops).
   */
  raidDropChance?: number;
  raidDropChancePerRaider?: number;
  items: DatabankItem[];
  /** Every raid boss, and what goes for them all (absent from a bot from before the databank had them). */
  bosses?: DatabankBoss[];
  raid?: DatabankRaid;
}

/** What the member owns of one item: how many copies, and the best one's level. */
export interface Owned {
  count: number;
  best: number;
}
