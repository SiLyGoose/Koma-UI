import type { Slot } from '../shared/items';

/*
 * The raid shop, as the bot's GET /api/raid-shop has it (its web/models/raid-shop.ts): the raid items
 * on the member's shelf this week (the server's, until they refresh it), each bought with komaGems (./page.ts).
 */

export interface RaidShopItem {
  id: string;
  name: string;
  stars: number;
  slot: Slot;
  description: string;
  /** What a new copy does (R1), as Discord writes it. */
  effects: string[];
  /** What a copy costs in komaGems. */
  price: number;
  /** How many copies of it they have. */
  owned: number;
}

export interface RaidShopView {
  /** Best tier first. */
  items: RaidShopItem[];
  /** Their komaGems in the server. */
  gems: number;
  /** When the shelf changes (ms). */
  resetsAt: number;
  /**
   * Paying for a new shelf: how many refreshes a week they get (`max`, 0 when it's off), how many of this
   * week's they have `left`, and what the next costs in komaGems (null with none left).
   */
  refresh: { max: number; left: number; price: number | null };
}
