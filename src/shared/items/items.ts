/*
 * What the gear and databank pages both draw: an item's picture (or its slot's icon until it has
 * one), its stars, and its effect lines as Discord writes them.
 */

export type Slot = 'weapon' | 'armor' | 'treasure';
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

export function stars(n: number): HTMLElement {
  const row = el('span', 'stars');
  row.setAttribute('aria-label', `${n} star${n === 1 ? '' : 's'}`);
  for (let i = 0; i < n; i++) row.append(el('span', 'star', '★'));
  return row;
}

/** What's on a copy's card, whatever the card is (an armory button, the anvil's, the details'): its rank, picture, stars and the parchment's curl. */
export function itemFace(copy: { level: number; itemId: string; slot: Slot; stars: number }): HTMLElement[] {
  return [el('span', 'item-level', `R${copy.level}`), art(copy.itemId, copy.slot), stars(copy.stars), el('span', 'item-curl')];
}

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
