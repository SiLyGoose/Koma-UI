import type { Slot } from '../shared/items';

export type Stars = 1 | 2 | 3 | 4;

/** GET /api/gacha (the bot's web/gacha.ts BannerView): what a pull costs the member, and where their pity stands. */
export interface BannerView {
  /** One pull in points, after their gear (a pull paid with a komaToken costs none). */
  cost: number;
  /** One pull in points without gear. */
  baseCost: number;
  /** How many pulls a multi pull makes. */
  multi: number;
  balance: number;
  /** komaTokens: each pays for one pull, before any points. */
  tokens: number;
  /** The tier pity works on (the unique treasures). */
  topStars: Stars;
  /** Pulls since their last top-tier item, and the pull that guarantees one: null when pity isn't in effect. */
  pity: { count: number; softStart: number; hardPity: number } | null;
  /** Their next top-tier item is one of their own treasures (their last was someone else's). */
  guaranteed: boolean;
  /** The unique treasure made for them, which the guarantee gives: null when none is theirs (absent from a bot from before it). */
  own?: { itemId: string; name: string; stars: Stars; slot: Slot } | null;
  /** Each tier's chance (0 to 1) on a pull, before pity raises the top one. */
  rates: Record<Stars, number>;
}

/** One item pulled (the bot's BannerPull). */
export interface BannerPull {
  itemId: string;
  name: string;
  stars: Stars;
  slot: Slot;
  description: string;
  /** Their first copy of it ever. */
  isNew: boolean;
  /** How many copies of it they own now. */
  count: number;
  /** Someone else's exclusive item: the share of its effects they get (null when it's theirs to use). */
  borrowed: number | null;
}

/** POST /api/gacha/pull (the bot's BannerResult). */
export interface BannerResult {
  pulls: BannerPull[];
  cost: number;
  tokensUsed: number;
  view: BannerView;
}
