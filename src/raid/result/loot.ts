import { sound } from '../../shared/audio';
import { art, SLOT_NAME, stars } from '../../shared/items';
import { remember, remembered } from '../../shared/util/storage';
import type { RaidLootItem, RaidView } from '../../protocol/raid';
import { state } from '../state';
import { ui } from '../ui';
import { el, popupShown } from '../widgets';

/*
 * The raid items a win gave them, over the end screen: all of them together, as the banner's multi pull
 * ends (../../banner/wish.ts), each one's card in its tier's colour. A card opens that item by itself,
 * in a burst of its colour with its name and stars; from there a click (or the arrows) goes through the
 * rest, and Back returns to all of them. It stays up until they close it, and comes up by itself once
 * for each win (the end screen's Your loot button brings it back).
 */

const SFX = (file: string): string => `${import.meta.env.BASE_URL}shared/sfx/items/${file}.mp3`;
const popup = sound(SFX('item_modal_popup'));
const popupClose = sound(SFX('item_modal_popup_close'));

/** Where the wins whose loot has been seen are kept (their keys, newest last). */
const SEEN_KEY = 'raid-loot-seen';
const SEEN_MAX = 20;

const seen = (): string[] => {
  try {
    const list: unknown = JSON.parse(remembered(SEEN_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
};

/** What's up now: the win's key and its items, and the one looked at by itself (null: all of them). */
let shown: { key: string; items: RaidLootItem[]; at: number | null } | null = null;
/** The win whose loot came up by itself this visit (so closing it without storage doesn't bring it back). */
let offered: string | null = null;

/** The end screen is up: their loot comes up over it, the first time they see this win's. */
export function offerLoot(v: RaidView): void {
  const loot = v.over?.loot ?? null;
  ui.lootAgain.hidden = !loot;
  if (!loot || loot.items.length === 0 || offered === loot.key || seen().includes(loot.key)) return;
  offered = loot.key;
  openLoot(loot);
}

/** Takes the loot down with the end screen (a new raid, the page moving on). */
export function hideLoot(): void {
  ui.lootAgain.hidden = true;
  if (!shown) return;
  shown = null;
  ui.lootPop.hidden = true;
  ui.lootStage.replaceChildren();
  popupShown();
}

function openLoot(loot: { key: string; items: RaidLootItem[] }): void {
  shown = { key: loot.key, items: loot.items, at: null };
  ui.lootPop.hidden = false;
  popupShown();
  draw();
  popup(0.35 + 0.15 * Math.max(...loot.items.map((item) => item.stars)));
  ui.lootPop.focus();
}

/** Closed by them: this win's loot doesn't come up by itself again. */
function closeLoot(): void {
  if (!shown) return;
  remember(SEEN_KEY, JSON.stringify([...seen().filter((key) => key !== shown?.key), shown.key].slice(-SEEN_MAX)));
  popupClose();
  hideLoot();
  ui.lootAgain.hidden = false;
}

/** Looks at one item by itself (null: back to all of them). */
function look(at: number | null): void {
  if (!shown) return;
  shown.at = at;
  draw();
  const item = at === null ? null : shown.items[at];
  if (item) popup(0.35 + 0.15 * item.stars);
}

/** The next item (after the last: back to all of them), or the one before. */
function step(by: 1 | -1): void {
  if (!shown || shown.at === null) return;
  const next = shown.at + by;
  look(next < 0 ? shown.items.length - 1 : next >= shown.items.length ? null : next);
}

function draw(): void {
  if (!shown) return;
  ui.lootStage.replaceChildren(shown.at === null ? mosaic(shown.items) : reveal(shown.items, shown.at));
}

/** The item's card, as the armories draw it. */
function card(item: RaidLootItem): HTMLElement {
  const face = el('span', 'item rd-loot-card');
  face.dataset.stars = String(item.stars);
  face.append(art(item.itemId, item.slot), stars(item.stars), el('span', 'item-curl'));
  return face;
}

/** All of them together, best first, coming in one after another. */
function mosaic(items: readonly RaidLootItem[]): HTMLElement {
  const box = el('div', 'rd-loot-all');
  const grid = el('ul', 'rd-loot-grid');
  grid.style.setProperty('--cols', String(Math.min(5, items.length)));
  for (const [i, item] of items.entries()) {
    const tile = el('li');
    const button = el('button', 'rd-loot-tile');
    button.type = 'button';
    button.dataset.stars = String(item.stars);
    button.style.setProperty('--i', String(i));
    button.title = `${item.name}: look at it`;
    button.append(card(item), el('span', 'rd-loot-tile-name', item.name));
    if (item.isNew) button.append(el('span', 'rd-loot-tile-new', 'New'));
    button.addEventListener('click', () => look(i));
    tile.append(button);
    grid.append(tile);
  }
  const close = el('button', 'rd-button primary rd-loot-done', 'Close');
  close.type = 'button';
  close.addEventListener('click', closeLoot);
  box.append(
    el('h2', 'rd-loot-title', items.length === 1 ? 'Raid loot' : `Raid loot ×${items.length}`),
    grid,
    el('p', 'rd-loot-tap', items.length === 1 ? 'Click it to look at it' : 'Click an item to look at it'),
    close,
  );
  return box;
}

/** One item by itself: its picture in a burst of its tier's colour, then its name and stars. */
function reveal(items: readonly RaidLootItem[], at: number): HTMLElement {
  const item = items[at] as RaidLootItem;
  const box = el('div', 'rd-loot-one');
  box.dataset.stars = String(item.stars);

  const burst = el('div', 'rd-loot-burst');
  burst.append(el('span', 'rd-loot-rays'), el('span', 'rd-loot-rays back'), el('span', 'rd-loot-core'), card(item));

  const text = el('div', 'rd-loot-text');
  const row = stars(item.stars);
  [...row.children].forEach((star, i) => (star as HTMLElement).style.setProperty('--i', String(i)));
  text.append(el('p', 'rd-loot-slot', SLOT_NAME[item.slot]), el('h2', 'rd-loot-name', item.name), row);
  if (item.isNew) text.append(el('p', 'rd-loot-new', 'New!'));

  const nav = el('div', 'rd-loot-nav');
  const arrow = (label: string, glyph: string, by: 1 | -1): HTMLButtonElement => {
    const button = el('button', 'rd-loot-arrow', glyph);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      step(by);
    });
    return button;
  };
  const back = el('button', 'rd-button rd-loot-back', items.length === 1 ? 'Back' : 'Back to all');
  back.type = 'button';
  back.addEventListener('click', (event) => {
    event.stopPropagation();
    look(null);
  });
  if (items.length > 1) nav.append(arrow('The one before', '‹', -1), el('span', 'rd-loot-count', `${at + 1} / ${items.length}`), arrow('The next one', '›', 1));
  nav.append(back);

  box.append(burst, text, nav);
  // A click anywhere else goes on to the next (after the last: back to all of them).
  box.addEventListener('click', () => step(1));
  return box;
}

/** The loot screen's buttons and keys, and the end screen's button that brings it back. */
export function wireLoot(): void {
  ui.lootClose.addEventListener('click', closeLoot);
  ui.lootAgain.addEventListener('click', () => {
    const loot = state.view?.over?.loot;
    if (loot && loot.items.length > 0) openLoot(loot);
  });
  ui.lootPop.addEventListener('keydown', (event) => {
    if (!shown) return;
    if (event.key === 'Escape') {
      if (shown.at === null) closeLoot();
      else look(null);
    } else if (shown.at !== null && event.key === 'ArrowRight') step(1);
    else if (shown.at !== null && event.key === 'ArrowLeft') step(-1);
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
}
