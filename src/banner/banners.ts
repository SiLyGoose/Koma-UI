import type { Slot } from '../shared/items';
import type { BannerView, HeroBanner, LimitedBanner, Stars } from './types';

/*
 * The banners the page offers, each its own tab along the top: the standard one (everything the
 * gacha holds: the bot's web/models/gacha.ts), the limited one while the bot says it is open
 * (its featured items, name and end come from the bot: the view's `limited`), and the Hero Item one,
 * whose top tier is the heroes' unique weapons (the view's `hero`).
 */

/** An item a banner shows off on its card (its picture is the item's, ../shared/items): a unique weapon says whose. */
export interface Featured {
  itemId: string;
  name: string;
  stars: Stars;
  slot: Slot;
  uniqueWeapon?: string | null;
}

export interface Banner {
  /** What the bot calls it (`banner` on its requests). */
  id: 'standard' | 'limited' | 'hero';
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

export const STANDARD: Banner = {
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
};

/** The limited banner as the bot has it, or null while it isn't open (or features nothing). */
export function limitedBanner(limited: LimitedBanner | undefined): Banner | null {
  const [first, second = first] = limited?.featured ?? [];
  if (!limited?.open || !first || !second) return null;
  // Its name in two parts, as the standard one's: the last word in ink.
  const words = limited.name.trim().split(/\s+/);
  const last = words.length > 1 ? (words.pop() as string) : '';
  return {
    id: 'limited',
    kind: 'Limited Wish',
    tab: 'Limited',
    name: [words.join(' '), last],
    blurb: `Only here, and only for now: ${limited.featured.map((item) => item.name).join(' and ')}.`,
    featured: [first, second],
    ends: limited.endsAt === null ? null : new Date(limited.endsAt),
  };
}

/** The Hero Item banner as the bot has it, or null from a bot from before it (or with no unique weapons). */
export function heroBanner(hero: HeroBanner | undefined): Banner | null {
  const [first, second = first] = hero?.featured ?? [];
  if (!first || !second) return null;
  return {
    id: 'hero',
    kind: 'Hero Item Wish',
    tab: 'Hero Item',
    name: ['Hero', 'Item'],
    blurb: `Every ${first.stars}★ here is a hero's unique weapon (${hero?.featured.map((item) => item.name).join(', ')}), each as likely, and only its own hero wields it.`,
    featured: [first, second],
    ends: null,
  };
}

/** The banners to offer, from the latest view, in the tabs' order: the limited one while it is open, the Hero Item one, then the standard one (always the rightmost). */
export function bannersFor(view: BannerView | null): Banner[] {
  return [limitedBanner(view?.limited), heroBanner(view?.hero), STANDARD].filter((banner): banner is Banner => banner !== null);
}

/** What's left of a banner, as Genshin writes it ("20 day(s) 18 hour(s) 5 minute(s)"), or that it's always there. */
export function timeLeft(banner: Banner, now = Date.now()): string {
  if (!banner.ends) return banner.id === 'limited' ? 'No end set' : 'Always available';
  const minutes = Math.max(0, Math.floor((banner.ends.getTime() - now) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days} day(s) ${hours} hour(s) ${minutes % 60} minute(s)`;
}
