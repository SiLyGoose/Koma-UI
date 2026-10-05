import type { Slot } from '../shared/items/items';

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

export interface Databank {
  maxLevel: number;
  /**
   * The chance (0 to 1) a party that beats a raid boss gets raid drops, each raider finding one, before
   * what each raider adds (raidDropChancePerRaider). 0 when drops are off (absent from a bot from before raid drops).
   */
  raidDropChance?: number;
  raidDropChancePerRaider?: number;
  items: DatabankItem[];
}

/** What the member owns of one item: how many copies, and the best one's level. */
export interface Owned {
  count: number;
  best: number;
}
