import { battlePicture, cardPicture, HERO_ASSETS, iconPicture, type HeroAssets, type SkinAssets } from '../technomagic/assets';
import { setWorn } from './heroes';
import type { HeroOutfitsView } from '../protocol/hero-outfits';

/** The heroes' outfits as the bot says them (../protocol/hero-outfits.ts). */
export type { HeroOutfitsView, HeroOutfitView } from '../protocol/hero-outfits';

/*
 * The heroes' outfits: King's Raid's costumes of the TechnoMagic Raid's heroes, each one of its hero's skins
 * (../technomagic/assets/heroes/<hero>.ts, after its own look), as the bot's GET /api/hero-outfits has them (its
 * web/models/hero-outfits.ts, by the skin's name). The shop's Hero Outfits tab buys them (../hero-outfit-shop/); a
 * hero's outfit room puts them on (../hero-outfits/). What each is called and pictured as is the raid's files'.
 */

/** One of a hero's looks: its own (the first) or an outfit, by its skin's place among its skins. */
export interface HeroLook {
  hero: string;
  /** Its skin's name (an outfit's id). */
  id: string;
  skin: number;
  /** What it is called: King's Raid's name for a costume, its hero's own for its own look. */
  title: string;
  /** King's Raid's own pictures of it (null: none): its tall card, its battle portrait (head and shoulders), its icon (its face). */
  card: string | null;
  battle: string | null;
  icon: string | null;
}

const assetsOf = (hero: string): HeroAssets | undefined => HERO_ASSETS.find((one) => one.folder === `heroes/${hero}`);

const lookOf = (hero: string, assets: HeroAssets, skin: SkinAssets, index: number): HeroLook => ({
  hero,
  id: skin.name,
  skin: index,
  title: skin.title ?? assets.name,
  card: cardPicture(assets, skin),
  battle: battlePicture(assets, skin),
  icon: iconPicture(assets, skin),
});

/** A hero's looks, its own first: all it can be dressed in. */
export function heroLooks(hero: string): HeroLook[] {
  const assets = assetsOf(hero);
  return assets ? assets.skins.map((skin, i) => lookOf(hero, assets, skin, i)) : [];
}

/** One of a hero's looks by its skin's name (an outfit's id), or null. */
export function heroLook(hero: string, id: string): HeroLook | null {
  return heroLooks(hero).find((look) => look.id === id) ?? null;
}

/** What their heroes wear, as the bot's hero outfits say it: their faces (../shared/heroes.ts heroCut) in it. */
export function noteWornOutfits(view: HeroOutfitsView): void {
  setWorn(Object.fromEntries(Object.entries(view.worn).map(([hero, outfit]) => [hero, skinOf(hero, outfit)])));
}

/** The skin a hero's worn outfit is (its place among its skins): its own look's (0) for none, or one the site doesn't know. */
export const skinOf = (hero: string, outfit: string | null | undefined): number => Math.max(0, outfit ? heroLooks(hero).findIndex((look) => look.id === outfit) : 0);
