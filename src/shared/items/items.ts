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
