import { type Busy, doneMark, working } from '../ui';
import { coin, points, powder } from '../util';
import { armoryOrder, type TmSort } from './gear';
import { dragonTier, el, hasLevels, heroGear, itemFace, itemIcons, type ItemType, ITEM_TYPE_NAME, kindName, levelLabel, lockBadge, mainStatLine, rich, shownName, type Slot, type Stars, tierOf, typeOf } from './items';
import type { HeroPart } from '../../protocol/heroes';
import type { MainStat } from '../../protocol/items';
import { matchesStars, type StarChoice } from './armory-filter/armory-filter';
import { padlock } from './padlock';
import { matchesSearch } from './search';
import { hoverSound } from './sfx';

/*
 * The armory every page draws the same way (the gear page's, the heroes page's, the forge's): its search, its grid of
 * cards on parchment (by the filter, the stars and the search, then blanks to fill out the last row), picking copies
 * to sell, and the picked copy's details over the character, with its lock. What differs between them (the tags,
 * which cards are greyed out, the details' notes and buttons) is the page's, handed in.
 */

/** A copy as the armories draw it: the gear page's and forge's (GearCopy) or the heroes page's (HeroCopy). */
export interface ArmoryCopy {
  id: string;
  itemId: string;
  name: string;
  stars: Stars;
  slot: Slot;
  /** Hero gear: the part of a hero's gear it is, which its details name it by and the filter picks it by. */
  part?: HeroPart | null;
  description: string;
  level: number;
  maxLevel: number;
  locked?: boolean;
  /** What selling it pays: null when it's never sold (worn, in a loadout, on a hero, locked); left out by a bot from before selling. */
  sell?: number | null;
  /** Hero gear: what selling it pays is gear powder, not zeiucoins. */
  sellPowder?: boolean;
  /** What selling it pays though it's locked, where a sale can take locked ones too (the heroes page's): null or left out otherwise. */
  sellLocked?: number | null;
  effects: string[];
  /** TechnoMagic gear's main stat (a weapon's HP, an armor's P.DEF or M.DEF): null or left out for anything else, or by a bot from before it said it. */
  mainStat?: MainStat | null;
  heroOnly?: boolean;
  uniqueWeapon?: string | null;
  uniqueTreasure?: { hero: string; skill: number } | null;
  /** Its class, as the gear page has it (`itemClass`) or the heroes page (`class`). */
  itemClass?: string | null;
  class?: string | null;
  /** Hero gear: its rune sockets, each the rune in it (its colour) or null for an empty one; none for a piece with no sockets. */
  runes?: readonly ({ color: string; name?: string } | null)[];
}

/** How a page wants one card drawn. */
export interface CardLook {
  /** The tag across its top ("Equipped", "On Kirze", "Material"), with a class of its own if any. */
  tag?: { text: string; className?: string } | null;
  /** Classes on the card (picked, inert, to-sell…). */
  classes?: Record<string, boolean>;
  disabled?: boolean;
  /** Set for a card that toggles (picking copies to sell). */
  pressed?: boolean;
  /** What else a screen reader hears, after its name, tier, rank, tag and lock ("on the anvil"). */
  says?: string[];
  /** Drawn over its face, last (the forge's "Refining", a sale's check). */
  over?: HTMLElement[];
}

export interface ArmoryDraw<C extends ArmoryCopy> {
  copies: readonly C[];
  slot: ItemType | 'all';
  stars: StarChoice;
  /** The search, trimmed and lowercased. */
  query: string;
  /** How TechnoMagic gear is sorted (the Filter's Sort): left out, in the armory's own order. */
  sort?: TmSort;
  /** Left out as if it weren't there (the gear page's gear only heroes wear, until its Filter shows it). */
  hidden?: (copy: C) => boolean;
  /** A filter of the page's own, on top of the stars and the search (the heroes page's class, the forge's Refineable). */
  matches?: (copy: C) => boolean;
  look: (copy: C) => CardLook;
  /** The copy whose details show, ringed (not while selling: the sale's red ring marks the cards then). */
  picked?: string | null;
  /** Picking copies to sell: the ones picked (null when not selling). What can't be sold is greyed out, and the cards toggle. */
  selling?: ReadonlySet<string> | null;
  /** Locked copies can be picked to sell too (the heroes page's Include locked). */
  sellLocked?: boolean;
  /** Said with nothing at all to show and no type picked ("You don't own any gear yet."). */
  none: string;
  /** Said with nothing shown, before anything else (the forge's "Nothing can be refined yet"). */
  first?: string | null;
  onPick: (copy: C) => void;
  /** False: a click on a card has the page's plain click sound (the forge's), not the item's own that `onPick` plays (../sfx.ts itemPicked). */
  ownSound?: boolean;
}

export interface ArmoryGrid<C extends ArmoryCopy> {
  element: HTMLElement;
  draw(what: ArmoryDraw<C>): void;
  /** The copies the last draw showed (by the filter, the stars and the search), in its order. */
  shown(): readonly C[];
  /** Stops listening to the window (the page going away). */
  destroy(): void;
}

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** A copy's tier in words, for a screen reader. */
const tierWords = (copy: ArmoryCopy): string => {
  const tier = tierOf(copy);
  return tier === 'tm' ? 'TechnoMagic' : tier === 'uw' ? 'unique weapon' : tier === 'ut' ? 'unique treasure' : `tier ${dragonTier(copy.itemId) ?? tier}`;
};

/** A card the grid has drawn, kept to be shown again as it is (armoryGrid). */
interface Card {
  button: HTMLButtonElement;
  /** What it was drawn from, but for its state (its classes, disabled, pressed), which is set on it each time. */
  content: string;
  /** The classes its state last put on it. */
  on: Set<string>;
  /** What a click on it does (the latest draw's). */
  pick: () => void;
}

/**
 * The armory's grid in `element`: drawn by `draw`, and again when a resize changes how many cards fit across. A card
 * already drawn is kept and shown again (with its picture, already in) unless what's on it changed: a pick, the search
 * or a filter only moves cards and sets their state, rather than drawing hundreds again.
 */
export function armoryGrid<C extends ArmoryCopy>(element: HTMLElement): ArmoryGrid<C> {
  let last: ArmoryDraw<C> | null = null;
  let lastShown: readonly C[] = [];
  let across = 0;
  const columns = (): number => getComputedStyle(element).gridTemplateColumns.split(' ').length || 4;
  /** By copy id. */
  const cards = new Map<string, Card>();
  const blanks: HTMLElement[] = [];
  const empty = el('p', 'armory-empty');

  /** `copy`'s card as `look` has it: the one drawn before if nothing on it changed, else drawn afresh. */
  function cardFor(copy: C, look: CardLook, ownSound: boolean, onPick: () => void): HTMLButtonElement {
    const content = contentOf(copy, look, ownSound);
    let kept = cards.get(copy.id);
    if (!kept || kept.content !== content) {
      const made: Card = { button: card(copy, look, ownSound, () => made.pick()), content, on: new Set(), pick: onPick };
      cards.set(copy.id, made);
      kept = made;
    }
    kept.pick = onPick;
    setState(kept, look);
    return kept.button;
  }

  function draw(what: ArmoryDraw<C>): void {
    last = what;
    const { slot, stars, query, hidden, matches, look } = what;
    // The sheet's scroll put back after: a grid much shorter for a moment would scroll it back to the top.
    across = columns();
    const sheet = element.parentElement as HTMLElement;
    const scrolled = sheet.scrollTop;
    element.classList.toggle('selling', !!what.selling);
    const ofSlot = armoryOrder(what.copies, what.sort).filter((c) => (slot === 'all' || typeOf(c) === slot) && !hidden?.(c));
    const shown = ofSlot.filter((c) => (matches?.(c) ?? true) && matchesStars(stars, tierOf(c)) && matchesSearch(query, { name: c.name, id: c.itemId, description: c.description }));
    lastShown = shown;
    const ownSound = what.ownSound !== false;
    const nodes: HTMLElement[] = shown.map((copy) => cardFor(copy, withSale(copy, look(copy), what), ownSound, () => what.onPick(copy)));
    const row = (n: number): number => Math.ceil(n / across) * across;
    const cells = Math.max(row(GRID_CELLS), row(shown.length));
    for (let i = 0; i < cells - shown.length; i++) nodes.push((blanks[i] ??= el('span', 'item blank')));
    if (shown.length === 0) {
      empty.textContent = what.first ?? (ofSlot.length > 0 ? 'No items match that.' : slot === 'all' ? what.none : `No ${ITEM_TYPE_NAME[slot].toLowerCase()} yet.`);
      nodes.push(empty);
    }
    place(element, nodes);
    // The cards of copies gone (sold, or someone else's shown now) aren't kept.
    const ids = new Set(what.copies.map((copy) => copy.id));
    for (const id of cards.keys()) if (!ids.has(id)) cards.delete(id);
    sheet.scrollTop = scrolled;
  }

  // Drawn again when as many cards don't fit across any more (the grid's width changed, not just the window's).
  const resized = new ResizeObserver(() => {
    if (last && across && columns() !== across) draw(last);
  });
  resized.observe(element);
  return { element, draw, shown: () => lastShown, destroy: () => resized.disconnect() };
}

/** Puts `nodes` in `parent` in that order (and nothing else), moving only what isn't already where it goes. */
function place(parent: HTMLElement, nodes: readonly Node[]): void {
  let at = parent.firstChild;
  for (const node of nodes) {
    if (node === at) at = at.nextSibling;
    else parent.insertBefore(node, at);
  }
  while (at) {
    const next = at.nextSibling;
    parent.removeChild(at);
    at = next;
  }
}

/** Everything a card is drawn from (card), but for its state (setState). */
const contentOf = (copy: ArmoryCopy, look: CardLook, ownSound: boolean): string =>
  JSON.stringify([
    copy.id,
    copy.itemId,
    // (Its picture: a hero gear's icon, once the bot has said it.)
    itemIcons.get(copy.itemId) ?? null,
    copy.name,
    copy.stars,
    copy.slot,
    copy.level,
    copy.maxLevel,
    copy.locked ?? null,
    copy.heroOnly ?? null,
    copy.uniqueWeapon ?? null,
    copy.uniqueTreasure ?? null,
    copy.itemClass ?? null,
    copy.class ?? null,
    look.tag ?? null,
    look.says ?? [],
    (look.over ?? []).map((node) => node.outerHTML),
    ownSound,
  ]);

/** A card's state as `look` has it: its classes (those it had before and hasn't now taken off), disabled, pressed. */
function setState(kept: Card, look: CardLook): void {
  const { button } = kept;
  const on = new Set(Object.entries(look.classes ?? {}).flatMap(([name, yes]) => (yes ? [name] : [])));
  for (const name of kept.on) if (!on.has(name)) button.classList.remove(name);
  for (const name of on) button.classList.add(name);
  kept.on = on;
  button.disabled = look.disabled === true;
  if (look.pressed === undefined) button.removeAttribute('aria-pressed');
  else button.setAttribute('aria-pressed', String(look.pressed));
}

/**
 * A card's look with the armory's own on it: ringed when its details show; picking copies to sell, ticked when picked,
 * and what can't be sold (worn, saved in a loadout or locked) greyed out, tagged "In loadout" when nothing else says why.
 */
function withSale(copy: ArmoryCopy, look: CardLook, { picked, selling, sellLocked }: { picked?: string | null; selling?: ReadonlySet<string> | null; sellLocked?: boolean }): CardLook {
  const classes = { picked: !selling && copy.id === picked, ...look.classes };
  if (!selling) return { ...look, classes };
  const on = selling.has(copy.id);
  const sellable = priceOf(copy, sellLocked) !== null;
  return {
    ...look,
    tag: look.tag ?? (!sellable && !copy.locked ? { text: 'In loadout' } : null),
    classes: { ...classes, 'to-sell': on },
    disabled: look.disabled === true || !sellable,
    pressed: on,
    over: [...(look.over ?? []), ...(on ? [el('span', 'item-check', '✓')] : [])],
  };
}

/** What selling a copy pays, or null when it can't be sold: a locked one's only with `unlocked` (locked ones picked too). */
export const priceOf = (copy: ArmoryCopy, unlocked = false): number | null =>
  typeof copy.sell === 'number' ? copy.sell : unlocked && typeof copy.sellLocked === 'number' ? copy.sellLocked : null;

/**
 * How many copies are picked to sell (of those that still can be; locked ones too with `unlocked`), what they sell for
 * together (`total` zeiucoins, and hero gear's `powder`), their ids, and how many of them are locked.
 */
export function saleOf(copies: readonly ArmoryCopy[], selling: ReadonlySet<string> | null, unlocked = false): { count: number; total: number; powder: number; ids: string[]; locked: number } {
  const ids: string[] = [];
  let total = 0;
  let powder = 0;
  let locked = 0;
  for (const copy of copies) {
    const price = priceOf(copy, unlocked);
    if (!selling?.has(copy.id) || price === null) continue;
    ids.push(copy.id);
    if (copy.sellPowder) powder += price;
    else total += price;
    if (typeof copy.sell !== 'number') locked++;
  }
  return { count: ids.length, total, powder, ids, locked };
}

/** What a sale pays, as amounts each with its picture after it: zeiucoins, gear powder or both (none of either: 0 zeiucoins). */
function worth(total: number, gearPowder: number): (Node | string)[] {
  const out: (Node | string)[] = [];
  if (total > 0 || gearPowder === 0) out.push(`${points(total)} `, coin('coin', 'zeiucoins'));
  if (gearPowder > 0) out.push(`${out.length > 0 ? ' + ' : ''}${points(gearPowder)} `, powder('coin powder'));
  return out;
}

/** Drops from `selling` what can't be sold any more (sold, put on or locked meanwhile; locked ones kept with `unlocked`). */
export function pruneSale(copies: readonly ArmoryCopy[], selling: Set<string>, unlocked = false): void {
  const sellable = new Set(copies.filter((copy) => priceOf(copy, unlocked) !== null).map((copy) => copy.id));
  for (const id of selling) if (!sellable.has(id)) selling.delete(id);
}

/**
 * The armory's Sell (to start picking, then, with some picked, to confirm) and Cancel beside it. A bot from before selling
 * prices nothing: no Sell. `unlocked`: locked ones are picked too; null where a sale never takes them (anywhere but the
 * heroes page, where a locked one is still a reason to start picking).
 */
export function drawSell(sell: HTMLButtonElement, cancel: HTMLElement, copies: readonly ArmoryCopy[], selling: ReadonlySet<string> | null, busy: Busy | null, shown: boolean, unlocked: boolean | null = null): void {
  const { count, total, powder: gearPowder } = saleOf(copies, selling, unlocked === true);
  sell.hidden = !shown || copies.some((copy) => copy.sell === undefined);
  sell.textContent = '';
  if (selling && count > 0) sell.append(`Sell ${count} · `, ...worth(total, gearPowder));
  else sell.append(selling ? 'Select items' : 'Sell');
  sell.disabled = selling ? count === 0 : !copies.some((copy) => priceOf(copy, unlocked !== null) !== null);
  working(sell, busy, 'sell');
  sell.classList.toggle('on', selling !== null);
  cancel.hidden = !shown || selling === null;
}

/**
 * Asks (in the page's sell-confirm dialog) to confirm selling `count` copies for `total` zeiucoins and `gearPowder` (hero
 * gear's), saying how many of them are `locked` (in its .sell-confirm-locked, where it has one).
 */
export function askSale(dialog: HTMLDialogElement, count: number, total: number, locked = 0, gearPowder = 0): void {
  if (count === 0) return;
  (dialog.querySelector('h3') as HTMLElement).textContent = `Sell ${count} item${count === 1 ? '' : 's'}?`;
  const amount = dialog.querySelector('.sell-confirm-total') as HTMLElement;
  amount.textContent = '';
  amount.append('+', ...worth(total, gearPowder));
  const lockedNote = dialog.querySelector<HTMLElement>('.sell-confirm-locked');
  if (lockedNote) {
    lockedNote.hidden = locked === 0;
    lockedNote.textContent = locked === count ? (locked === 1 ? 'It is locked.' : 'All of them are locked.') : `${locked} of them ${locked === 1 ? 'is' : 'are'} locked.`;
  }
  dialog.showModal();
}

/** The sell-confirm dialog's buttons (and a click on its backdrop, which cancels): `confirmed` on Sell. */
export function wireSaleDialog(dialog: HTMLDialogElement, confirmed: () => void): void {
  dialog.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-sell]');
    if (!button && event.target !== dialog) return;
    dialog.close();
    if (button?.dataset.sell === 'confirm') confirmed();
  });
}

/** What a sale came to, in the page's status line (hero gear's gear powder too, and what it crafts). */
export function saleSaid(status: HTMLElement, sold: { count: number; earned: number; powder?: number }): void {
  status.hidden = false;
  status.classList.remove('bad');
  status.textContent = '';
  status.append(`Sold ${sold.count} item${sold.count === 1 ? '' : 's'} for `, ...worth(sold.earned, sold.powder ?? 0));
  if ((sold.powder ?? 0) > 0) {
    const shop = el('a', '', 'Raid Gear shop');
    shop.href = '/shop/raid/';
    status.append(' (craft komaGems from it in the ', shop, ')');
  }
}

/** Under a copy's rank while picking copies to sell: what it sells for (nothing, when it can't be sold; a locked one's with `unlocked`). */
export function sellsFor(copy: ArmoryCopy, unlocked = false): HTMLElement[] {
  const value = priceOf(copy, unlocked);
  if (value === null) return [];
  const price = el('span', 'detail-mw detail-sells', `Sells for ${points(value)} `);
  price.append(copy.sellPowder ? powder('coin powder') : coin('coin', 'zeiucoins'));
  return [price];
}

/**
 * A copy's Upgrade (a hero's gear: Awaken, King's Raid's), in its details' buttons: to the forge (`go`), with it on the anvil.
 * At its top, "✓ Max" in its place; none for one never refined (hasLevels).
 */
export function upgradeButton(copy: ArmoryCopy, go: () => void): HTMLElement | null {
  if (!hasLevels(copy)) return null;
  if (copy.level >= copy.maxLevel) return doneMark('Max');
  const button = el('button', 'detail-action action secondary', heroGear(copy) ? 'Awaken' : 'Upgrade');
  button.type = 'button';
  button.addEventListener('click', go);
  return button;
}

/** The forge with `copy` on its anvil. */
export const forgeLink = (copy: ArmoryCopy): string => `/forge/?copy=${encodeURIComponent(copy.id)}`;

/**
 * A copy's lock, in its details' top corner: a padlock, shut when it's kept from being sold or used up by a refine.
 * `toggle` (theirs to change): a button that locks or unlocks it; else just shown when shut. A bot from before locking: none.
 */
export function lockToggle(copy: ArmoryCopy, busy: Busy | null, toggle: ((locked: boolean) => void) | null): HTMLElement | null {
  if (copy.locked === undefined || (!toggle && !copy.locked)) return null;
  const lock = el('button', `detail-lock action secondary icon${copy.locked ? ' on' : ''}`);
  lock.type = 'button';
  lock.setAttribute('aria-pressed', String(copy.locked));
  lock.setAttribute('aria-label', 'Locked');
  lock.append(padlock(copy.locked));
  if (!toggle) {
    lock.disabled = true;
    lock.title = 'Locked';
    return lock;
  }
  working(lock, busy, `lock:${copy.id}`);
  lock.title = copy.locked ? 'Locked: unlock to let it be sold or used up by a refine again' : 'Lock to keep it from being sold or used up by a refine';
  lock.addEventListener('click', () => toggle(!copy.locked));
  return lock;
}

/** One copy's card in the grid (its state, setState's). */
function card(copy: ArmoryCopy, look: CardLook, ownSound: boolean, onPick: () => void): HTMLButtonElement {
  const button = el('button', 'item');
  button.type = 'button';
  button.dataset.stars = String(copy.stars);
  const says = [shownName(copy), tierWords(copy), ...(hasLevels(copy) ? [levelLabel(copy)] : []), ...(look.tag ? [look.tag.text.toLowerCase()] : []), ...(copy.locked ? ['locked'] : []), ...(look.says ?? [])];
  button.setAttribute('aria-label', says.join(', '));
  if (look.tag) button.append(el('span', look.tag.className ? `item-tag ${look.tag.className}` : 'item-tag', look.tag.text));
  button.append(...itemFace(copy, true));
  if (copy.locked) button.append(lockBadge());
  button.append(...(look.over ?? []));
  if (ownSound) button.dataset.sfx = 'own';
  hoverSound(button, copy.id, () => !button.disabled);
  button.addEventListener('click', onPick);
  return button;
}

/** The armory's search: `onChange` hears what it asks for (trimmed and lowercased); Escape in it empties it (every browser, not just those that do it themselves), and does nothing else. */
export function wireSearch(input: HTMLInputElement, onChange: (query: string) => void): void {
  input.addEventListener('input', () => onChange(input.value.trim().toLowerCase()));
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || input.value === '') return;
    event.preventDefault();
    event.stopPropagation();
    input.value = '';
    onChange('');
  });
}

/** A copy's effect lines (or `none`, with none). */
export function effectList(copy: { effects: readonly string[] }, none: string, className = 'detail-effects'): HTMLElement {
  const list = el('ul', className);
  for (const line of copy.effects) list.appendChild(el('li')).append(rich(line));
  if (copy.effects.length === 0) list.append(el('li', 'muted', none));
  return list;
}

/** The copy equipping the one shown would take off, and what it does, set apart from the shown one's effects. */
export const replacesNote = (copy: ArmoryCopy, none: string): HTMLElement[] => [
  el('p', 'detail-replaces', `Replaces ${shownName(copy)}${hasLevels(copy) ? ` (${levelLabel(copy)})` : ''}`),
  effectList(copy, none, 'detail-effects detail-replaced'),
];

/** What a page puts in a copy's details, around what every armory's show. */
export interface DetailParts {
  onClose(): void;
  /** The heading over its effects ("Effects", "On a hero"), what they say with none, and whether they're greyed out (counting for nothing where it is). */
  label: string;
  none: string;
  effectsOff?: boolean;
  /** TechnoMagic gear's set and additional effects (../items.ts tmSections), as the page has them on or off. */
  sections: HTMLElement[];
  /** Under those, in the page's order: notes, what it replaces, what upgrading does. */
  notes?: HTMLElement[];
  /** Beside its card, after its slot and rank (the lock). */
  corner?: HTMLElement | null;
  /** Under its rank ("Sells for…", "Equipped"). */
  info?: HTMLElement[];
  /** Its buttons, under a line along the bottom (none: no line). */
  actions?: HTMLElement[];
}

/**
 * A picked copy's details in `box` (over the character; a sheet from the bottom on narrow screens): its name and ✕
 * across the top, its card big beside its slot and rank, its description and effects, then the page's notes, and its
 * buttons. All but the buttons scrolls, when it runs longer than the panel. No copy: hidden.
 */
export function showDetail(box: HTMLElement, copy: ArmoryCopy | undefined, parts?: DetailParts): void {
  box.hidden = !copy || !parts;
  box.textContent = '';
  if (!copy || !parts) return;
  box.dataset.stars = String(copy.stars);
  box.setAttribute('aria-label', shownName(copy));

  const bar = el('div', 'detail-bar');
  const close = el('button', 'detail-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.dataset.sfx = 'own';
  close.addEventListener('click', parts.onClose);
  bar.append(el('h3', '', shownName(copy)), close);

  const top = el('div', 'detail-top');
  const big = el('span', 'item detail-card');
  big.dataset.stars = String(copy.stars);
  big.append(...itemFace(copy));
  const info = el('div', 'detail-info');
  const kind = el('p', 'detail-kind', kindName(copy));
  info.append(kind);
  // (Right under its slot, its main stat (an armor's P. DEF, a unique weapon's ATK…); its stars are on its card, and MAX by its slot at the top.)
  if (copy.mainStat) info.append(mainStatLine(copy.mainStat));
  if (hasLevels(copy) && copy.level >= copy.maxLevel) kind.append(el('span', 'detail-max', 'MAX'));
  info.append(...(parts.info ?? []));
  top.append(big, info);
  if (parts.corner) top.append(parts.corner);

  const body = el('div', 'detail-body');
  body.append(
    el('p', 'detail-desc', copy.description),
    el('p', 'detail-label', parts.label),
    effectList(copy, parts.none, parts.effectsOff ? 'detail-effects off' : 'detail-effects'),
    ...parts.sections,
    ...(parts.notes ?? []),
  );

  const scroll = el('div', 'detail-scroll');
  scroll.append(bar, top, body);
  box.append(scroll);
  if (parts.actions?.length) {
    const foot = el('div', 'detail-foot');
    foot.append(...parts.actions);
    box.append(foot);
  }
}
