import { type Busy, doneMark, working } from '../ui';
import { coin, dust, points } from '../util';
import { armoryOrder, type TmSort } from './gear';
import { dragonTier, el, hasLevels, heroGear, heroTier, isTmPiece, itemFace, itemIcons, type ItemType, ITEM_TYPE_NAME, kindName, levelLabel, lockBadge, mainStatLine, rich, shownName, type Slot, type Stars, tierOf, typeOf } from './items';
import type { HeroPart } from '../../protocol/heroes';
import type { MainStat } from '../../protocol/items';
import { matchesStars, type StarChoice } from './armory-filter/armory-filter';
import { padlock } from './padlock';
import { crystalCount, stoneCount } from './stones';
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
  /** Hero gear: the komaDust salvaging it gives, whenever it can be sold (sell, sellLocked); left out: it can't be salvaged. */
  salvage?: number;
  /** A TechnoMagic piece: the Upgrade Stones of its class salvaging it gives, in place of komaDust (King's Raid's). */
  salvageStones?: { class: string; count: number };
  /** And the Boss Crystals of its set. */
  salvageCrystals?: { set: string; count: number };
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
  /** What else a copy is searched by (the inventory's: a unique weapon's or treasure's hero's name). */
  words?: (copy: C) => string;
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
  /** At least this many cells, blanks filling out the rest (the inventory's: as many as fill its sheet); left out, GRID_CELLS. */
  least?: number;
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

/** How an armory's grid is drawn. */
export interface GridOptions {
  /**
   * Only the rows in sight in `scroller` (the box the grid scrolls in) are drawn, and a few either side, the rest left as room
   * of their height: for an armory of thousands of copies (the inventory's), where drawing every card makes opening it, picking
   * one and searching slow. Its cards are squares (cards.css), so where each row is is known without drawing it.
   */
  scroller?: HTMLElement;
}

/** Drawing only the rows in sight (GridOptions.scroller): how many more are drawn either side, so a quick scroll doesn't show them empty. */
const ROWS_AROUND = 3;

/**
 * Whether `copy` is of the tier picked: a hero's gear's T6 to T10 by its own (heroTier); TechnoMagic gear a TechnoMagic set's
 * piece or the old TechnoMagic gear (its one level), not any other hero's gear (which tierOf calls TechnoMagic too); anything
 * else as matchesStars has it.
 */
const ofTier = (choice: StarChoice, copy: ArmoryCopy): boolean => {
  if (typeof choice === 'number' && choice >= 6) return heroGear(copy) && heroTier(copy) === choice;
  if (choice === 'tm') return tierOf(copy) === 'tm' && (isTmPiece(copy.itemId) || !hasLevels(copy));
  return matchesStars(choice, tierOf(copy));
};

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
export function armoryGrid<C extends ArmoryCopy>(element: HTMLElement, options: GridOptions = {}): ArmoryGrid<C> {
  const { scroller } = options;
  let last: ArmoryDraw<C> | null = null;
  let lastShown: readonly C[] = [];
  // How many cards fit across: read where the page is laid out anyway (the resize observer's), not on every draw, where
  // reading it would lay out the whole page there and then (hundreds of cards, a page just changed under them).
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

  /** The last draw's cells, for drawing the rows in sight again as it scrolls (GridOptions.scroller): its copies, then how many blanks. */
  let laid: { shown: readonly C[]; cells: number; what: ArmoryDraw<C>; ownSound: boolean } | null = null;
  /** The rows drawn now (from, to), so a scroll within them draws nothing. */
  let drawn: [number, number] = [-1, -1];

  /** `copy`'s card as the draw `what` has it. */
  const cardOf = (copy: C, what: ArmoryDraw<C>, ownSound: boolean): HTMLButtonElement =>
    cardFor(copy, withSale(copy, what.look(copy), what), ownSound, () => what.onPick(copy));

  /**
   * Where the grid is, for drawing the rows in sight (GridOptions.scroller): a row's height (a card's side and the gap under
   * it), where the grid starts in what the scroller scrolls, how far it's scrolled and how tall it is. Read only where the page
   * is laid out anyway (its resize observer, a scroll's frame), never in a draw (the gear page's armory's rule: one read there
   * lays out the whole page then and there). Null until first read.
   */
  let at: { rowH: number; top: number; scrolled: number; height: number } | null = null;
  function measure(): void {
    if (!scroller) return;
    const style = getComputedStyle(element);
    across = style.gridTemplateColumns.split(' ').length || across || 4;
    const side = (element.clientWidth - (parseFloat(style.columnGap) || 0) * (across - 1)) / across;
    at = {
      rowH: side + (parseFloat(style.rowGap) || 0),
      top: element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop,
      scrolled: scroller.scrollTop,
      height: scroller.clientHeight,
    };
  }

  /**
   * Draws the rows of the last draw in sight in the scroller (and ROWS_AROUND either side), the rest as room above and below
   * them; `force`: even when they're the rows drawn already (the draw changed). Not measured yet (the first draw, before the
   * page is laid out): its first rows, the resize observer drawing the right ones once it is.
   */
  function drawRows(force: boolean): void {
    if (!laid || !scroller) return;
    const { shown, cells, what, ownSound } = laid;
    const rows = Math.ceil(cells / across);
    const rowH = at?.rowH ?? 0;
    let from = 0;
    let to = Math.min(rows, 12);
    if (at && rowH > 0) {
      from = Math.max(0, Math.floor((at.scrolled - at.top) / rowH) - ROWS_AROUND);
      to = Math.min(rows, Math.ceil((at.scrolled + at.height - at.top) / rowH) + ROWS_AROUND);
    }
    if (!force && from === drawn[0] && to === drawn[1]) return;
    drawn = [from, to];
    const nodes: HTMLElement[] = [];
    for (let i = from * across; i < Math.min(cells, to * across); i++) {
      const copy = shown[i];
      nodes.push(copy ? cardOf(copy, what, ownSound) : (blanks[i - shown.length] ??= el('span', 'item blank')));
    }
    if (shown.length === 0) nodes.push(empty);
    element.style.paddingTop = `${from * rowH}px`;
    element.style.paddingBottom = `${(rows - to) * rowH}px`;
    place(element, nodes);
  }

  /** Scrolled: the rows in sight now, once a frame. */
  let queued = 0;
  const onScroll = (): void => {
    if (!queued) queued = requestAnimationFrame(() => {
      queued = 0;
      measure();
      drawRows(false);
    });
  };
  scroller?.addEventListener('scroll', onScroll, { passive: true });

  function draw(what: ArmoryDraw<C>): void {
    last = what;
    const { slot, stars, query, hidden, matches, look, words } = what;
    if (!across) across = columns();
    element.classList.toggle('selling', !!what.selling);
    const ofSlot = armoryOrder(what.copies, what.sort).filter((c) => (slot === 'all' || typeOf(c) === slot) && !hidden?.(c));
    const shown = ofSlot.filter((c) => (matches?.(c) ?? true) && ofTier(stars, c) && matchesSearch(query, { name: c.name, id: c.itemId, description: words ? `${c.description} ${words(c)}` : c.description }));
    lastShown = shown;
    const ownSound = what.ownSound !== false;
    if (scroller) {
      const row = (n: number): number => Math.ceil(n / across) * across;
      if (shown.length === 0) empty.textContent = what.first ?? (ofSlot.length > 0 ? 'No items match that.' : slot === 'all' ? what.none : `No ${ITEM_TYPE_NAME[slot].toLowerCase()} yet.`);
      laid = { shown, cells: Math.max(row(what.least ?? GRID_CELLS), row(shown.length)), what, ownSound };
      drawRows(true);
      forget(what);
      return;
    }
    const nodes: HTMLElement[] = shown.map((copy) => cardFor(copy, withSale(copy, look(copy), what), ownSound, () => what.onPick(copy)));
    const row = (n: number): number => Math.ceil(n / across) * across;
    const cells = Math.max(row(what.least ?? GRID_CELLS), row(shown.length));
    for (let i = 0; i < cells - shown.length; i++) nodes.push((blanks[i] ??= el('span', 'item blank')));
    if (shown.length === 0) {
      empty.textContent = what.first ?? (ofSlot.length > 0 ? 'No items match that.' : slot === 'all' ? what.none : `No ${ITEM_TYPE_NAME[slot].toLowerCase()} yet.`);
      nodes.push(empty);
    }
    place(element, nodes);
    forget(what);
  }

  /** The cards of copies gone (sold, or someone else's shown now) aren't kept. */
  function forget(what: ArmoryDraw<C>): void {
    const ids = new Set(what.copies.map((copy) => copy.id));
    for (const id of cards.keys()) if (!ids.has(id)) cards.delete(id);
  }

  // Drawn again when as many cards don't fit across any more (the grid's width changed, not just the window's); drawing the rows
  // in sight, whenever the grid or the scroller changes size (a row's height, how many rows are in sight).
  const resized = new ResizeObserver(() => {
    if (scroller) {
      measure();
      if (last) draw(last);
      return;
    }
    const now = columns();
    if (now === across) return;
    across = now;
    if (last) draw(last);
  });
  // (Drawing the rows in sight, the grid's whole height, room and all: not the rows drawn, which change as it scrolls.)
  resized.observe(element, scroller ? { box: 'border-box' } : undefined);
  if (scroller) resized.observe(scroller);
  return {
    element,
    draw,
    shown: () => lastShown,
    destroy: () => {
      resized.disconnect();
      scroller?.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(queued);
    },
  };
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
 * together (`total` zeiucoins), what salvaging them gives (`dust`, komaDust: hero gear's; `stones`, a TechnoMagic piece's
 * Upgrade Stones, by class, and `crystals`, its Boss Crystals, by set) and how many of them can be (`salvageable`), their ids, and
 * how many of them are locked.
 */
export function saleOf(
  copies: readonly ArmoryCopy[],
  selling: ReadonlySet<string> | null,
  unlocked = false,
): { count: number; total: number; dust: number; stones: Record<string, number>; crystals: Record<string, number>; salvageable: number; ids: string[]; locked: number } {
  const ids: string[] = [];
  let total = 0;
  let dust = 0;
  const stones: Record<string, number> = {};
  const crystals: Record<string, number> = {};
  let salvageable = 0;
  let locked = 0;
  for (const copy of copies) {
    const price = priceOf(copy, unlocked);
    if (!selling?.has(copy.id) || price === null) continue;
    ids.push(copy.id);
    total += price;
    if (copy.salvage !== undefined) {
      dust += copy.salvage;
      salvageable++;
    }
    if (copy.salvageStones) stones[copy.salvageStones.class] = (stones[copy.salvageStones.class] ?? 0) + copy.salvageStones.count;
    if (copy.salvageCrystals) crystals[copy.salvageCrystals.set] = (crystals[copy.salvageCrystals.set] ?? 0) + copy.salvageCrystals.count;
    if (typeof copy.sell !== 'number') locked++;
  }
  return { count: ids.length, total, dust, stones, crystals, salvageable, ids, locked };
}

/** What a salvage gives besides komaDust: its TechnoMagic pieces' Upgrade Stones, by class, and Boss Crystals, by set. */
export interface SalvageExtras {
  stones?: Readonly<Record<string, number>>;
  crystals?: Readonly<Record<string, number>>;
}

/**
 * What a salvage gives, in words and pictures: its komaDust (left out with none, but for nothing at all) and its TechnoMagic
 * pieces' Upgrade Stones and Boss Crystals (`short`: "3 Upgrade Stones + 300 Crystals" all told, for a button; else each kind by name).
 */
function salvageWorth(dustAmount: number, { stones = {}, crystals = {} }: SalvageExtras, short = false): (Node | string)[] {
  const stoneKinds = Object.entries(stones).filter(([, count]) => count > 0);
  const crystalKinds = Object.entries(crystals).filter(([, count]) => count > 0);
  const out: (Node | string)[] = dustAmount > 0 || (stoneKinds.length === 0 && crystalKinds.length === 0) ? worth(dustAmount, true) : [];
  const sum = (kinds: [string, number][]): number => kinds.reduce((all, [, count]) => all + count, 0);
  const parts: string[] = short
    ? [
        ...(stoneKinds.length > 0 ? [`${points(sum(stoneKinds))} Upgrade Stone${sum(stoneKinds) === 1 ? '' : 's'}`] : []),
        ...(crystalKinds.length > 0 ? [`${points(sum(crystalKinds))} Crystal${sum(crystalKinds) === 1 ? '' : 's'}`] : []),
      ]
    : [...stoneKinds.map(([cls, count]) => stoneCount(cls, count)), ...crystalKinds.map(([set, count]) => crystalCount(set, count))];
  if (parts.length === 0) return out;
  if (out.length > 0) out.push(' + ');
  out.push(parts.join(short ? ' + ' : ', '));
  return out;
}

/** What a sale pays, its amount with its picture after it: zeiucoins, or (a salvage) komaDust. */
const worth = (amount: number, salvage: boolean): (Node | string)[] => [`${points(amount)} `, salvage ? dust('coin powder') : coin('coin', 'zeiucoins')];

/** Drops from `selling` what can't be sold any more (sold, put on or locked meanwhile; locked ones kept with `unlocked`). */
export function pruneSale(copies: readonly ArmoryCopy[], selling: Set<string>, unlocked = false): void {
  const sellable = new Set(copies.filter((copy) => priceOf(copy, unlocked) !== null).map((copy) => copy.id));
  for (const id of selling) if (!sellable.has(id)) selling.delete(id);
}

/**
 * The armory's Sell (to start picking, then, with some picked, to confirm) and Cancel beside it; while picking, Salvage too
 * (hero gear for komaDust: only while every one picked is hero gear), where there is hero gear. A bot from before selling
 * prices nothing: no Sell. `unlocked`: locked ones are picked too; null where a sale never takes them (anywhere but the
 * heroes page, where a locked one is still a reason to start picking).
 */
export function drawSell(sell: HTMLButtonElement, salvage: HTMLButtonElement, cancel: HTMLElement, copies: readonly ArmoryCopy[], selling: ReadonlySet<string> | null, busy: Busy | null, shown: boolean, unlocked: boolean | null = null): void {
  const { count, total, dust: salvaged, stones, crystals, salvageable } = saleOf(copies, selling, unlocked === true);
  sell.hidden = !shown || copies.some((copy) => copy.sell === undefined);
  sell.textContent = '';
  if (selling && count > 0) sell.append(`Sell ${count} · `, ...worth(total, false));
  else sell.append(selling ? 'Select items' : 'Sell');
  sell.disabled = selling ? count === 0 : !copies.some((copy) => priceOf(copy, unlocked !== null) !== null);
  working(sell, busy, 'sell');
  sell.classList.toggle('on', selling !== null);
  salvage.hidden = sell.hidden || selling === null || !copies.some((copy) => copy.salvage !== undefined);
  salvage.textContent = '';
  const all = count > 0 && salvageable === count;
  if (all) salvage.append(`Salvage ${count} · `, ...salvageWorth(salvaged, { stones, crystals }, true));
  else salvage.append('Salvage');
  salvage.disabled = !all;
  salvage.title = count > 0 && !all ? 'Only hero gear can be salvaged' : '';
  working(salvage, busy, 'salvage');
  cancel.hidden = !shown || selling === null;
}

/**
 * Asks (in the page's sell-confirm dialog) to confirm selling `count` copies for `amount` zeiucoins (`salvage`: salvaging
 * them for `amount` komaDust), saying how many of them are `locked` (in its .sell-confirm-locked, where it has one).
 */
export function askSale(dialog: HTMLDialogElement, count: number, amount: number, locked = 0, salvage = false, extras: SalvageExtras = {}): void {
  if (count === 0) return;
  const verb = salvage ? 'Salvage' : 'Sell';
  dialog.dataset.salvage = String(salvage);
  (dialog.querySelector('h3') as HTMLElement).textContent = `${verb} ${count} item${count === 1 ? '' : 's'}?`;
  const total = dialog.querySelector('.sell-confirm-total') as HTMLElement;
  total.textContent = '';
  total.append('+', ...(salvage ? salvageWorth(amount, extras) : worth(amount, false)));
  (dialog.querySelector('.sell-confirm-note') as HTMLElement).textContent = `${salvage ? 'Salvaged' : 'Sold'} items are gone for good.`;
  (dialog.querySelector('[data-sell="confirm"]') as HTMLElement).textContent = verb;
  const lockedNote = dialog.querySelector<HTMLElement>('.sell-confirm-locked');
  if (lockedNote) {
    lockedNote.hidden = locked === 0;
    lockedNote.textContent = locked === count ? (locked === 1 ? 'It is locked.' : 'All of them are locked.') : `${locked} of them ${locked === 1 ? 'is' : 'are'} locked.`;
  }
  dialog.showModal();
}

/** The sell-confirm dialog's buttons (and a click on its backdrop, which cancels): `confirmed` on Sell or Salvage (`salvage`: which). */
export function wireSaleDialog(dialog: HTMLDialogElement, confirmed: (salvage: boolean) => void): void {
  dialog.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-sell]');
    if (!button && event.target !== dialog) return;
    dialog.close();
    if (button?.dataset.sell === 'confirm') confirmed(dialog.dataset.salvage === 'true');
  });
}

/** What a sale came to, in the page's status line (a salvage's komaDust, and what it crafts; its TechnoMagic pieces' Upgrade Stones). */
export function saleSaid(status: HTMLElement, sold: { count: number; earned: number; powder?: number; stones?: Partial<Record<string, number>>; crystals?: Partial<Record<string, number>> }): void {
  status.hidden = false;
  status.classList.remove('bad');
  status.textContent = '';
  // (A salvage: komaDust, and a TechnoMagic piece's Upgrade Stones in its place, King's Raid's.)
  const counts = (of: Partial<Record<string, number>> | undefined): Record<string, number> => Object.fromEntries(Object.entries(of ?? {}).map(([id, count]) => [id, count ?? 0]));
  const extras = { stones: counts(sold.stones), crystals: counts(sold.crystals) };
  const salvaged = (sold.powder ?? 0) > 0 || [...Object.values(extras.stones), ...Object.values(extras.crystals)].some((count) => count > 0);
  status.append(`${salvaged ? 'Salvaged' : 'Sold'} ${sold.count} item${sold.count === 1 ? '' : 's'} for `, ...(salvaged ? salvageWorth(sold.powder ?? 0, extras) : worth(sold.earned, false)));
  if ((sold.powder ?? 0) > 0) {
    const craft = el('a', '', 'Craft');
    craft.href = '/inventory/craft/';
    status.append(' (craft komaGems from it in the Inventory’s ', craft, ')');
  }
}

/**
 * Under a copy's rank while picking copies to sell: what it sells for, and hero gear's what salvaging it gives (nothing,
 * when it can't be sold; a locked one's with `unlocked`).
 */
export function sellsFor(copy: ArmoryCopy, unlocked = false): HTMLElement[] {
  const value = priceOf(copy, unlocked);
  if (value === null) return [];
  const price = el('span', 'detail-mw detail-sells', 'Sells for ');
  price.append(...worth(value, false));
  if (copy.salvage !== undefined)
    price.append(
      ' · Salvages for ',
      ...salvageWorth(copy.salvage, {
        ...(copy.salvageStones && { stones: { [copy.salvageStones.class]: copy.salvageStones.count } }),
        ...(copy.salvageCrystals && { crystals: { [copy.salvageCrystals.set]: copy.salvageCrystals.count } }),
      }),
    );
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
  /** In its card's place, its slot and rank under it (a hero's unique treasures: its main treasure with its sub treasures). */
  card?: HTMLElement;
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
  top.append(parts.card ?? big, info);
  if (parts.card) top.classList.add('stacked');
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
