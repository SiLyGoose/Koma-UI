/*
 * What the gear and databank pages both draw: an item's picture (or its slot's icon until it has
 * one), its stars, and its effect lines as Discord writes them.
 */

import { FACE, heroCut } from '../heroes';
import type { Slot } from '../../protocol/items';

export type { Slot, Stars } from '../../protocol/items';


export const SLOT_NAME: Record<Slot, string> = { weapon: 'Weapon', armor: 'Armor', treasure: 'Treasure' };

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** The masterwork foil's animations (items.css). */
const HOLO = new Set(['holo', 'holo-hue']);

/**
 * Keeps every masterwork's foil in step with the page's clock rather than its card's: a card drawn
 * again (on a click, after an update) would otherwise start its bands over, so they'd jump. Each new
 * foil animation is set to have started when the page did, so it carries on where the old one was
 * (and every card's bands move together). It's done as the cards go in, before they're painted.
 */
export const keepHoloInStep = (): void => {
  const align = (): void => {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation && HOLO.has(animation.animationName) && animation.startTime !== 0) {
        animation.startTime = 0;
      }
    }
  };
  new MutationObserver(align).observe(document.body, { subtree: true, childList: true, attributeFilter: ['class'] });
  align();
};

// ---------------------------------------------------------------------------
// Pictures

/** Items that already have a picture on the site. Any other item's is public/gear/items/<slot folder>/<id>.png, once it's there. */
const ART: Record<string, string> = {
  'golden-pickaxe': '/pinecraft/pickaxes/pickaxe_gold.png',
  'diamond-pickaxe': '/pinecraft/pickaxes/pickaxe_diamond.png',
  'ruby-pickaxe': '/pinecraft/pickaxes/pickaxe_ruby.png',
  'amethyst-pickaxe': '/pinecraft/pickaxes/pickaxe_amethyst.png',
};

/**
 * Shown in place of an item with no picture: its slot's icon, the same ones as Koma's slot emoji in
 * Discord (public/gear/slots/<slot>.png).
 */
const slotIcon = (slot: Slot): string => `/gear/slots/${slot}.png`;

/** The folder of public/gear/items each slot's pictures are in. */
const ITEM_DIR: Record<Slot, string> = { weapon: 'weapons', armor: 'armor', treasure: 'treasures' };

/** Items whose public/gear/items picture isn't there, so the page doesn't keep asking. */
const noArt = new Set<string>();

/**
 * An item's picture. One of public/gear/items is a full picture (`full`): it fills the whole card or
 * frame it's in, with the rest drawn over it. The sprites in ART, and the slot icon standing in for
 * a missing picture (`glyph`), stay small in the middle.
 */
export function art(itemId: string | null, slot: Slot): HTMLElement {
  const box = el('span', 'art');
  const glyph = (): void => {
    box.classList.remove('full');
    box.classList.add('glyph');
    const icon = el('img');
    icon.alt = '';
    icon.draggable = false;
    icon.src = slotIcon(slot);
    box.replaceChildren(icon);
  };
  if (!itemId || noArt.has(itemId)) {
    glyph();
    return box;
  }
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  const sprite = ART[itemId];
  img.src = sprite ?? `/gear/items/${ITEM_DIR[slot]}/${itemId}.png`;
  if (!sprite) box.classList.add('full');
  img.addEventListener('error', () => {
    noArt.add(itemId);
    img.remove();
    glyph();
  });
  box.append(img);
  return box;
}

/** TechnoMagic gear's tier, in place of stars: a tier of its own, above 4 stars. */
export function tmTier(): HTMLElement {
  const tier = el('span', 'tm-tier', 'TM');
  tier.setAttribute('aria-label', 'TechnoMagic');
  return tier;
}

export function stars(n: number): HTMLElement {
  const row = el('span', 'stars');
  row.setAttribute('aria-label', `${n} star${n === 1 ? '' : 's'}`);
  for (let i = 0; i < n; i++) row.append(el('span', 'star', '★'));
  return row;
}

/**
 * TechnoMagic gear's marks, as King's Raid draws its TM gear: a "TM" tab over its top left corner, and over its
 * top right one a tab with its class's symbol (none for gear of no class). Its card is otherwise as any other's,
 * its border gold (styles/tm.css, for a card with these in it).
 */
export function tmMarks(itemClass: string | null | undefined): HTMLElement[] {
  const tag = el('span', 'item-tm', 'TM');
  tag.setAttribute('aria-label', 'TechnoMagic gear');
  if (!itemClass) return [tag];
  const tab = el('span', 'item-tm-class');
  tab.title = `${itemClass[0]?.toUpperCase()}${itemClass.slice(1)} only`;
  tab.setAttribute('aria-label', tab.title);
  // The class's own symbol (public/gear/classes/<id>_glyph.png: the one on its badge, alone), tinted by tm.css.
  const glyph = el('span', 'item-tm-glyph');
  glyph.style.setProperty('--glyph', `url("/gear/classes/${itemClass}_glyph.png")`);
  tab.append(glyph);
  return [tag, tab];
}

/** A unique weapon's tier, in place of stars: a tier of its own, between TechnoMagic gear and 4 stars. */
export function uwTier(): HTMLElement {
  const tier = el('span', 'uw-tier', 'UW');
  tier.setAttribute('aria-label', 'Unique weapon');
  return tier;
}

/**
 * A unique weapon's marks, as TechnoMagic gear's (tmMarks) but in crimson: a "UW" tab over its top left corner, and
 * over its top right one its hero's face (styles/uw.css, for a card with these in it).
 */
export function uwMarks(hero: string): HTMLElement[] {
  const tag = el('span', 'item-uw', 'UW');
  tag.setAttribute('aria-label', 'Unique weapon');
  const tab = el('span', 'item-uw-hero');
  const name = hero
    .split('-')
    .map((word) => `${word[0]?.toUpperCase()}${word.slice(1)}`)
    .join(' ');
  tab.title = `${name} only`;
  tab.setAttribute('aria-label', tab.title);
  const face = el('img');
  face.alt = '';
  face.hidden = true;
  void heroCut(hero, FACE, 96).then((src) => {
    if (!src) return;
    face.src = src;
    face.hidden = false;
  });
  tab.append(face);
  return [tag, tab];
}

/** An item's tier as the filters and the lists have it: TechnoMagic gear's or a unique weapon's own, or its stars. */
export const tierOf = (item: { stars: number; heroOnly?: boolean; uniqueWeapon?: string | null }): number | 'tm' | 'uw' =>
  item.uniqueWeapon ? 'uw' : item.heroOnly ? 'tm' : item.stars;

/**
 * What's on a copy's card, whatever the card is (an armory button, the anvil's, the details'): its rank, picture, stars and the
 * parchment's curl. TechnoMagic gear (`heroOnly`) has no stars, being a tier of its own, but its marks (with its class:
 * `itemClass`, or `class` as the heroes page has it); a unique weapon its own marks, with its hero.
 */
export function itemFace(copy: { level: number; itemId: string; slot: Slot; stars: number; heroOnly?: boolean; uniqueWeapon?: string | null; itemClass?: string | null; class?: string | null }): HTMLElement[] {
  if (copy.uniqueWeapon) return [el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), ...uwMarks(copy.uniqueWeapon)];
  if (copy.heroOnly) return [el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), ...tmMarks(copy.itemClass ?? copy.class)];
  return [el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl')];
}

/** How an item ranks among the tiers, best highest: TechnoMagic gear above 4 stars, and the unique weapons between them. */
export const tierRank = (item: { stars: number; heroOnly?: boolean; uniqueWeapon?: string | null }): number => (item.uniqueWeapon ? 4.5 : item.heroOnly ? 5 : item.stars);

/**
 * An effect line as Discord shows it: custom emoji (<:name:id>) become their pictures, **bold**,
 * *italics* and `commands` are kept, everything else is plain text.
 */
export function rich(line: string): DocumentFragment {
  const out = document.createDocumentFragment();
  for (const part of line.split(/(<a?:\w+:\d+>|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)) {
    if (!part) continue;
    const emoji = /^<(a?):(\w+):(\d+)>$/.exec(part);
    if (emoji) {
      const img = el('img', 'emoji');
      img.src = `https://cdn.discordapp.com/emojis/${emoji[3]}.${emoji[1] ? 'gif' : 'webp'}?size=32`;
      img.alt = `:${emoji[2]}:`;
      out.append(img);
    } else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) out.append(el('strong', '', part.slice(2, -2)));
    else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) out.append(el('em', '', part.slice(1, -1)));
    else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) out.append(el('code', '', part.slice(1, -1)));
    else out.append(part);
  }
  return out;
}

/**
 * One of TechnoMagic gear's effects, set apart under the item's other effects after a gap: what it is called on
 * a line of its own ("3-set effect:", "Additional Effect:"), then what it does on the next (a line, or more).
 * `on` says whether it is on for a copy: light blue when it is, greyed out when it isn't (left out: neither, as
 * the databank's item, which no one wears).
 */
export function effectSection(label: string, body: string | Node, on?: boolean): HTMLElement {
  const section = el('div', on === undefined ? 'detail-section' : on ? 'detail-section on' : 'detail-section off');
  const text = el('div', 'detail-section-text');
  text.append(typeof body === 'string' ? rich(body) : body);
  section.append(el('p', 'detail-section-label', label), text);
  return section;
}

/**
 * A TechnoMagic copy's set effect and additional effect, each set apart, light blue while it is on and greyed out
 * while it isn't (none for another copy, or from a bot from before it said them so; neither colour from one before
 * it said whether they're on).
 */
export function tmSections(copy: { setEffect?: { pieces: number; text: string; active?: boolean } | null; additional?: string | null; additionalActive?: boolean }): HTMLElement[] {
  return [
    ...(copy.setEffect ? [effectSection(`${copy.setEffect.pieces}-set effect:`, copy.setEffect.text, copy.setEffect.active)] : []),
    ...(copy.additional ? [effectSection('Additional Effect:', copy.additional, copy.additionalActive)] : []),
  ];
}

/**
 * A locked copy's mark on its card: a dark tab set into the card's right edge, holding a white padlock
 * outlined in black with a black keyhole.
 */
export function lockBadge(): HTMLElement {
  const badge = el('span', 'item-lock');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML =
    '<path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="#000" stroke-width="5" />' +
    '<path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="#fff" stroke-width="2.4" />' +
    '<rect x="4.2" y="10" width="15.6" height="12.3" rx="2" fill="#fff" stroke="#000" stroke-width="1.4" />' +
    '<circle cx="12" cy="14.6" r="1.9" fill="#000" /><rect x="11.1" y="15.2" width="1.8" height="4.3" rx="0.6" fill="#000" />';
  badge.append(icon);
  return badge;
}
