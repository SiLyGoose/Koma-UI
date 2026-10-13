import type { Slot } from '../shared/items';

export type Stars = 1 | 2 | 3 | 4;

/** The limited banner (the bot's LimitedBanner): on either banner's view, so the page knows whether to offer it. */
export interface LimitedBanner {
  name: string;
  /** Whether it takes pulls now. */
  open: boolean;
  /** When it opens and closes (ms since the epoch): null where none is set. */
  startsAt: number | null;
  endsAt: number | null;
  featured: { itemId: string; name: string; stars: Stars; slot: Slot; description: string }[];
  /** The chance (0 to 1) a top-tier item from it is a featured one, when that isn't guaranteed. */
  featuredChance: number;
}

/** GET /api/gacha?banner=… (the bot's web/models/gacha.ts BannerView): what a pull costs the member, and where their pity stands on a banner. */
export interface BannerView {
  /** The banner this is the view of (absent from a bot from before the limited banner: the standard one). */
  banner?: 'standard' | 'limited';
  /** The limited banner as it stands (absent from a bot from before it). */
  limited?: LimitedBanner;
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
  /** Their next top-tier item is one of their own treasures (their last was someone else's). On the limited banner: it is a featured item. */
  guaranteed: boolean;
  /** The unique treasure made for them, which the guarantee gives: null when none is theirs (absent from a bot from before it). */
  own?: { itemId: string; name: string; stars: Stars; slot: Slot } | null;
  /**
   * The items this banner's guarantee can give them (their own treasures, or the limited banner's
   * featured items), and the one they picked for it to give (an item id): null for any of them
   * (both absent from a bot from before the pick).
   */
  choices?: { itemId: string; name: string; stars: Stars; slot: Slot }[];
  pick?: string | null;
  /** Each tier's chance (0 to 1) on a pull, before pity raises the top one. */
  rates: Record<Stars, number>;
  /** The chance (0 to 1) each of their pulls gives a second item for nothing (Pot of Greed): absent from a bot from before it. */
  extraChance?: number;
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
  /** The items the pulls gave on top for nothing (Pot of Greed), in order (absent from a bot from before it). */
  extras?: BannerPull[];
  cost: number;
  tokensUsed: number;
  view: BannerView;
}
