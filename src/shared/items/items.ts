/*
 * What the gear and databank pages both draw: an item's picture (or its slot's icon until it has
 * one), its stars, and its effect lines as Discord writes them.
 */

import { built, hasItemArt } from '../built';
import { HERO_PART_NAME, heroCut, type HeroPart, TAB_FACE } from '../heroes';
import { points } from '../util';
import type { MainStat, Slot } from '../../protocol/items';

export type { Slot, Stars } from '../../protocol/items';


export const SLOT_NAME: Record<Slot, string> = { weapon: 'Weapon', armor: 'Armor', treasure: 'Treasure' };

/** What an item is, as its details say it: hero gear by its part (an accessory's or an orb's slot is the treasure's), anything else by its slot. */
export const kindName = (item: { slot: Slot; part?: HeroPart | null }): string => (item.part ? HERO_PART_NAME[item.part] : SLOT_NAME[item.slot]);

/**
 * What the armories' filters pick an item by: its slot, but hero gear's Mantle (M.DEF; its slot is the armor's, whose
 * Armor is P.DEF) and its accessories, orbs and artifacts (whose slot is the treasure's) by their part.
 */
export type ItemType = Slot | 'secondary' | 'accessory' | 'orb' | 'artifact';

export const ITEM_TYPE_NAME: Record<ItemType, string> = { ...SLOT_NAME, secondary: 'Mantle', accessory: 'Accessory', orb: 'Orb', artifact: 'Artifact' };

export const typeOf = (item: { slot: Slot; part?: HeroPart | null }): ItemType =>
  item.part === 'secondary' || item.part === 'accessory' || item.part === 'orb' || item.part === 'artifact' ? item.part : item.slot;

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
const ITEM_DIR = { weapon: 'weapons', armor: 'armor', treasure: 'treasures' } as const satisfies Record<Slot, string>;

/** King's Raid's hero gear's icons (public/kr/items/<icon>.webp), by item id: as the bot says them (the heroes page's copies). */
export const itemIcons = new Map<string, string>();

/** Items whose picture couldn't be read, so the page doesn't keep asking. */
const noArt = new Set<string>();

/**
 * An item's picture. One of public/gear/items is a full picture (`full`): it fills the whole card or
 * frame it's in, with the rest drawn over it. The sprites in ART, and the slot icon standing in for
 * a missing picture (`glyph`), stay small in the middle. An item with no picture there (the build says
 * which: ../built.ts) has its slot's icon without asking for one. `lazy`: one of a long list (an armory,
 * the databank), whose picture waits until it's scrolled near (and the page transition doesn't wait for it).
 */
export function art(itemId: string | null, slot: Slot, lazy = false): HTMLElement {
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
  const sprite = itemId ? ART[itemId] : undefined;
  const icon = itemId ? itemIcons.get(itemId) : undefined;
  if (icon && itemId && !noArt.has(itemId)) {
    const img = el('img');
    img.alt = '';
    img.draggable = false;
    if (lazy) img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `/kr/items/${icon}.webp`;
    box.classList.add('full');
    img.addEventListener('error', () => {
      noArt.add(itemId);
      img.remove();
      glyph();
    });
    box.append(img);
    return box;
  }
  if (!itemId || noArt.has(itemId) || (!sprite && !hasItemArt(ITEM_DIR[slot], itemId))) {
    glyph();
    return box;
  }
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  if (lazy) img.loading = 'lazy';
  img.decoding = 'async';
  img.src = sprite ?? built(`/gear/items/${ITEM_DIR[slot]}/${itemId}.png`);
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

/**
 * The members' own gear's tier, T1 to T4 (its rarity: what was its stars, which are now a copy's level), as a small label in
 * its tier's colour (styles/tier.css), as TechnoMagic gear's and the unique weapons' are.
 */
export function tierMark(n: number): HTMLElement {
  const mark = el('span', 'tier-mark', `T${n}`);
  mark.dataset.tier = String(n);
  mark.setAttribute('aria-label', `Tier ${n}`);
  return mark;
}

/** The members' own gear's tier as its card's frame: King's Raid's grade frame of its tier's colour (styles/tier.css), over the card's edge. */
export function tierFrame(n: number): HTMLElement {
  const frame = el('span', 'tier-frame');
  frame.dataset.tier = String(n);
  return frame;
}

/**
 * TechnoMagic gear's marks, as King's Raid draws its TM gear: a "TM" tab over its top left corner, and over its
 * top right one a tab with its class's symbol (none for gear of no class; a "?" for ANY_CLASS: a set's pieces, whichever
 * class's comes). Its card is otherwise as any other's, its border gold (styles/tm.css, for a card with these in it).
 */
/** TechnoMagic gear of whichever class (a set's pieces, as a raid's rewards say them): its class tab says "?". */
export const ANY_CLASS = '?';

export function tmMarks(itemClass: string | null | undefined): HTMLElement[] {
  const tag = el('span', 'item-tm', 'TM');
  tag.setAttribute('aria-label', 'TechnoMagic gear');
  if (!itemClass) return [tag];
  if (itemClass === ANY_CLASS) {
    const any = el('span', 'item-tm-class');
    any.title = 'Any class';
    any.setAttribute('aria-label', any.title);
    any.append(el('span', 'item-tm-any', '?'));
    return [tag, any];
  }
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

/** A unique treasure's tier, in place of stars: a tier of its own, between the unique weapons and 4 stars. */
export function utTier(): HTMLElement {
  const tier = el('span', 'uw-tier ut-tier', 'UT');
  tier.setAttribute('aria-label', 'Unique treasure');
  return tier;
}

/** A unique treasure's marks: a unique weapon's (uwMarks), its tab "UT" (styles/uw.css). */
export const utMarks = (hero: string): HTMLElement[] => uwMarks(hero, true);

/**
 * A unique weapon's marks, as TechnoMagic gear's (tmMarks) but in crimson: a "UW" tab over its top left corner, and
 * over its top right one its hero's face (styles/uw.css, for a card with these in it). A unique treasure's (`treasure`),
 * the same, its tab "UT".
 */
export function uwMarks(hero: string, treasure = false): HTMLElement[] {
  const tag = el('span', treasure ? 'item-uw item-ut' : 'item-uw', treasure ? 'UT' : 'UW');
  tag.setAttribute('aria-label', treasure ? 'Unique treasure' : 'Unique weapon');
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
  void heroCut(hero, TAB_FACE, 96).then((src) => {
    if (!src) return;
    face.src = src;
    face.hidden = false;
  });
  tab.append(face);
  return [tag, tab];
}

/** A unique treasure as a copy or an item says it. */
type Treasure = { hero: string; skill: number } | null | undefined;

/** An item's tier as the filters and the lists have it: TechnoMagic gear's, a unique weapon's or a unique treasure's own, or its stars. */
export const tierOf = (item: { stars: number; heroOnly?: boolean; uniqueWeapon?: string | null; uniqueTreasure?: Treasure }): number | 'tm' | 'uw' | 'ut' =>
  item.uniqueWeapon ? 'uw' : item.uniqueTreasure ? 'ut' : item.heroOnly ? 'tm' : item.stars;

/** Whether a copy has levels (stars) to show, up to its top: not the old TechnoMagic gear, which has the one (`maxLevel` 1). */
export const hasLevels = (copy: { maxLevel?: number }): boolean => copy.maxLevel !== 1;

/**
 * Whether an item is a hero's gear (the bot's heroOnly: King's Raid's pieces and artifacts, unique weapons and unique
 * treasures), whose stars (0★ to 5★) are raised by awakening it with a duplicate (King's Raid's); the members' own gear's
 * (1★ to 5★) by refining it.
 */
export const heroGear = (item: { heroOnly?: boolean; uniqueWeapon?: string | null; uniqueTreasure?: Treasure | null }): boolean =>
  item.heroOnly === true || !!item.uniqueWeapon || !!item.uniqueTreasure;

/** Whether an item is a piece of a TechnoMagic set (Perseverance, Hope, Authority: its id says it), which has TechnoMagic gear's marks. */
export const isTmPiece = (itemId: string): boolean => /^(perseverance|hope|authority)-/.test(itemId);

/** A copy's level (its stars) as a page says it: "★3". */
export const levelLabel = (copy: { level: number }): string => `★${copy.level}`;

/**
 * A copy's stars (its level), as King's Raid draws them on its gear (public/kr/ui/: its TechnoMagic_Equip_Star, even on all
 * sides): `level` lit, then (with `max`) the rest dark. Gold, but (`tm`) a TechnoMagic piece's own blue. A hero's gear at 0★
 * has none lit.
 */
export function krStars(level: number, max = level, tm = false): HTMLElement {
  const row = el('span', 'kr-stars');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `${level} star${level === 1 ? '' : 's'}`);
  for (let i = 1; i <= max; i++) {
    const lit = i <= level;
    const star = el('img', `kr-star${lit ? '' : ' off'}${lit && tm ? ' tm' : ''}`);
    star.src = `${import.meta.env.BASE_URL}kr/ui/star-${lit ? (tm ? 'tm' : 'on') : 'off'}.webp`;
    star.alt = '';
    star.draggable = false;
    row.append(star);
  }
  return row;
}

/** A rune in a copy's socket as its card shows it (the heroes page's HeroRune): its kind's colour, red, green or blue. */
type SocketRune = { color: string; name?: string } | null;

/** The rune kinds' names by their colour, as King's Raid sorts its runes. */
const RUNE_KIND: Readonly<Record<string, string>> = { red: 'Offensive', green: 'Utility', blue: 'Defensive' };

/**
 * A copy's rune sockets, as King's Raid draws them down its card's left edge (styles/runes.css): a gold ring filled dark
 * each, its rune's gem in it, red for an offensive rune, green for a utility one, blue for a defensive one; an empty one's
 * gem fading in and out pink. None for a piece with no sockets.
 */
export function runeMarks(runes: readonly SocketRune[] | undefined): HTMLElement[] {
  if (!runes?.length) return [];
  const column = el('span', 'kr-runes');
  column.setAttribute('role', 'img');
  const says = runes.map((rune) => (rune ? `${RUNE_KIND[rune.color] ?? 'A'} rune${rune.name ? ` (${rune.name})` : ''}` : 'empty rune socket'));
  column.setAttribute('aria-label', says.join(', '));
  for (const rune of runes) column.append(el('span', rune ? `kr-rune ${rune.color}` : 'kr-rune empty'));
  return [column];
}

/**
 * What's on a copy's card, whatever the card is (an armory button, the anvil's, the details'): its picture, its level as
 * King's Raid's stars (krStars; none with the one level: hasLevels), and what kind it is: the members' own gear its tier
 * (T1 to T4, and King's Raid's grade frame) and the parchment's curl; a hero's gear its marks (a TechnoMagic piece's stars blue), a unique weapon's or unique treasure's with its hero, a
 * TechnoMagic piece's with its class (`itemClass`, or `class` as the heroes page has it), none for a dragon set's piece or
 * an artifact, and its rune sockets (runeMarks). `lazy`: a card in a long list (art).
 */
export function itemFace(copy: { level: number; maxLevel?: number; itemId: string; slot: Slot; stars: number; heroOnly?: boolean; uniqueWeapon?: string | null; uniqueTreasure?: Treasure; itemClass?: string | null; class?: string | null; runes?: readonly SocketRune[] }, lazy = false): HTMLElement[] {
  const picture = art(copy.itemId, copy.slot, lazy);
  const level = hasLevels(copy) ? [krStars(copy.level, copy.level, isTmPiece(copy.itemId))] : [];
  if (heroGear(copy)) return [picture, ...heroMarks(copy), ...runeMarks(copy.runes), ...level];
  return [tierFrame(copy.stars), tierMark(copy.stars), picture, ...level, el('span', 'item-curl')];
}

/** A hero's gear's marks (itemFace): a unique weapon's or unique treasure's, a TechnoMagic piece's, or none. */
export function heroMarks(copy: { itemId: string; uniqueWeapon?: string | null; uniqueTreasure?: Treasure; itemClass?: string | null; class?: string | null }): HTMLElement[] {
  if (copy.uniqueWeapon) return uwMarks(copy.uniqueWeapon);
  if (copy.uniqueTreasure) return utMarks(copy.uniqueTreasure.hero);
  return isTmPiece(copy.itemId) ? tmMarks(copy.itemClass ?? copy.class) : [];
}

/** How an item ranks among the tiers, best highest: TechnoMagic gear above 4 stars, and the unique weapons, then the unique treasures, between them. */
export const tierRank = (item: { stars: number; heroOnly?: boolean; uniqueWeapon?: string | null; uniqueTreasure?: Treasure }): number =>
  item.uniqueWeapon ? 4.5 : item.uniqueTreasure ? 4.4 : item.heroOnly ? 5 : item.stars;

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
 * A unique treasure's lines as the bot says them, apart: its options (a copy's, or the databank's pool of them), and what
 * it gives as its hero's main treasure (its HP, then its effect, each without its "as main treasure").
 */
export function treasureParts(lines: readonly string[]): { options: string[]; main: string[] } {
  const isMain = (line: string): boolean => /^As main treasure: |, as main treasure, /.test(line);
  return {
    options: lines.filter((line) => !isMain(line)),
    main: lines.filter(isMain).map((line) => line.replace(/^As main treasure: /, '').replace(/^.+? only, as main treasure, /, '')),
  };
}

/** What a unique treasure gives as its hero's main treasure, set apart as a TechnoMagic copy's effects are: lit while it is (`on`), greyed while it isn't. */
export function treasureSection(main: readonly string[], on?: boolean): HTMLElement[] {
  if (main.length === 0) return [];
  const list = el('ul', 'detail-effects');
  for (const line of main) list.appendChild(el('li')).append(rich(line));
  return [effectSection('Main Treasure:', list, on)];
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
 * A TechnoMagic copy's main stat (King's Raid's at 5★), where another item's details have its rank: its name, then how
 * much, like "HP 1,634,124". `className` is the page's (the gear and heroes pages' detail-main, the raid's tm-loot-main).
 */
export function mainStatLine(stat: MainStat, className = 'detail-main'): HTMLElement {
  const line = el('p', className);
  line.append(el('span', 'main-stat-name', stat.name), el('span', 'main-stat-value', points(stat.value)));
  return line;
}

/** The main stats a TechnoMagic item's copy can have, as the databank says them: a weapon's, or an armor's two, whichever it rolls. */
export const mainStatText = (stats: readonly MainStat[]): string =>
  stats.map(({ name, value }) => `**${name}** ${points(value)}`).join(' or ') + (stats.length > 1 ? ', one at random as it drops' : '');

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
