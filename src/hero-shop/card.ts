import { className, heroCard } from '../shared/heroes';
import { el } from '../shared/items';
import type { Line } from '../technomagic/sim/rules';

/*
 * The shop's hero cards (King's Raid's Special Shop's Heroes: hero-shop.css) and the Front, Middle and Back buttons beside
 * the Filter over them: the Heroes tab's (./page.ts), and the Hero Outfits tab's (../hero-outfit-shop/), which lists the
 * heroes the same way.
 */

/** A hero's picture in `img`: King's Raid's own card of it, as its shop shows it (hidden with none); `fallback` shows its initial instead. */
export function showCard(img: HTMLImageElement, id: string, fallback?: HTMLElement): void {
  const src = heroCard(id);
  img.hidden = !src;
  if (!src) return;
  img.src = src;
  fallback?.remove();
}

/** A hero as its card shows it. */
export interface CardHero {
  id: string;
  name: string;
  class: string;
}

/**
 * One hero's card: its picture and class badge, its name, and at the bottom `foot` (its price, that it's theirs…); `state`
 * its data-state (hero-shop.css, ../outfits/outfits.css: 'owned' isn't pressed), `label` what it says to a screen reader.
 */
export function heroShopCard(hero: CardHero, state: string, foot: readonly HTMLElement[], label: string): HTMLButtonElement {
  const button = el('button', 'outfit-card hero-card');
  button.type = 'button';
  button.dataset.hero = hero.id;
  button.dataset.state = state;

  const art = el('span', 'hero-card-art');
  const initial = el('span', 'hero-card-initial', hero.name.slice(0, 1));
  const picture = el('img', 'hero-card-picture');
  picture.alt = '';
  picture.draggable = false;
  art.append(initial, picture);
  showCard(picture, hero.id, initial);
  const badge = el('img', 'hero-card-class');
  // King's Raid's own (its shop's round badge, 128px: the gear page's is too small to stay sharp this big).
  badge.src = `/kr/ui/badge-${hero.class}.webp`;
  badge.alt = '';
  badge.title = className(hero.class);
  art.append(badge);

  const bottom = el('span', 'outfit-foot');
  bottom.append(...foot);
  button.append(art, el('span', 'outfit-name', hero.name), bottom);
  button.setAttribute('aria-label', label);
  return button;
}

export const LINE_NAME = { front: 'Front', middle: 'Middle', back: 'Back' } as const;

/** Front, Middle and Back in `box`, each a choice (the page presses the one picked). */
export function lineButtons(box: HTMLElement): HTMLButtonElement[] {
  const buttons = (Object.keys(LINE_NAME) as Line[]).map((line) => {
    const button = el('button', 'action choice', LINE_NAME[line]);
    button.type = 'button';
    button.dataset.line = line;
    button.setAttribute('aria-pressed', 'false');
    return button;
  });
  box.append(...buttons);
  return buttons;
}
