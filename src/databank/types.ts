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
}

export interface Databank {
  maxLevel: number;
  items: DatabankItem[];
}

/** What the member owns of one item: how many copies, and the best one's level. */
export interface Owned {
  count: number;
  best: number;
}
