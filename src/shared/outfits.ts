/*
 * The member's outfits, as the bot's GET /api/outfits has them (its web/models/outfits.ts): the shop's
 * Outfits tab buys them (../outfits/), the dressing room puts them on (../dressing/). Each is drawn as the
 * character with its id (./characters.ts).
 */

export interface Outfit {
  id: string;
  name: string;
  /** What it costs in points (0 for the default, which everyone has). */
  price: number;
  owned: boolean;
}

export interface OutfitsView {
  /** In the shop's order, the default first. */
  outfits: Outfit[];
  /** The one they wear. */
  worn: string;
  balance: number;
}
