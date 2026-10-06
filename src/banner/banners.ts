import type { Slot } from '../shared/items/items';
import type { Stars } from './types';

/*
 * The banners the page offers, each its own tab along the top. Only the standard one pulls for now (from
 * everything the gacha holds: the bot's web/gacha.ts); a limited banner will be another entry here,
 * with its own featured items and an end.
 */

/** An item a banner shows off on its card (its picture is the item's, ../shared/items). */
export interface Featured {
  itemId: string;
  name: string;
  stars: Stars;
  slot: Slot;
}

export interface Banner {
  id: string;
  /** Its kind, on the tag over its name ("Standard Wish"). */
  kind: string;
  /** What its tab along the top says ("Standard"). */
  tab: string;
  /** Its name, in two parts: the first in red, the second in ink. */
  name: [string, string];
  /** What it's about, under the odds box. */
  blurb: string;
  /** The items on its card: the first big, the second smaller on the red panel ("etc."). */
  featured: [Featured, Featured];
  /** When it ends, or null when it's always there. */
  ends: Date | null;
}

export const BANNERS: readonly Banner[] = [
  {
    id: 'standard',
    kind: 'Standard Wish',
    tab: 'Standard',
    name: ['Starfall', 'Invocation'],
    blurb: 'Every item the gacha holds can fall here. The unique treasures fall red.',
    featured: [
      { itemId: 'piplup', name: 'Piplup', stars: 4, slot: 'treasure' },
      { itemId: 'chaewon-photocard', name: 'Chaewon Photocard', stars: 4, slot: 'treasure' },
    ],
    ends: null,
  },
];

/** What's left of a banner, as Genshin writes it ("20 day(s) 18 hour(s) 5 minute(s)"), or that it's always there. */
export function timeLeft(banner: Banner, now = Date.now()): string {
  if (!banner.ends) return 'Always available';
  const minutes = Math.max(0, Math.floor((banner.ends.getTime() - now) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days} day(s) ${hours} hour(s) ${minutes % 60} minute(s)`;
}
