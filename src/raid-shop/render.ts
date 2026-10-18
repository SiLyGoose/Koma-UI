import { GEM_EMOJI } from '../forge/anvil/gem';
import { el, itemFace, rich, tierMark } from '../shared/items';
import { working } from '../shared/ui';
import { points } from '../shared/util';
import type { RaidShopContext } from './context';
import type { RaidShopItem } from './types';

/** An amount of komaGems: the gem, then the number (`short`: in red, a price that's more than they have: ../outfits/outfits.css). */
const price = (amount: number, short = false): (Node | string)[] => [rich(GEM_EMOJI), el('span', short ? 'price-short' : '', points(amount))];

/** How long until `at` (ms), as numbers and their units: 3 d 4 h, 5 h 12 m, or 8 m. */
function until(at: number, now = Date.now()): [number, string][] {
  const minutes = Math.max(0, Math.ceil((at - now) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return [[days, 'd'], [hours, 'h']];
  return hours > 0 ? [[hours, 'h'], [minutes % 60, 'm']] : [[minutes, 'm']];
}

/** An item's card as the armories draw a copy (../shared/items): a new one, so R1. */
function face(item: RaidShopItem, tag: 'button' | 'span'): HTMLElement {
  const card = el(tag, 'item');
  if (card instanceof HTMLButtonElement) card.type = 'button';
  card.dataset.stars = String(item.stars);
  card.append(...itemFace({ level: 1, itemId: item.id, slot: item.slot, stars: item.stars }));
  return card;
}

/**
 * One item's tile: its card, its name, how many they have, and a button with its price (one of the site's,
 * flat and its number in red when they can't pay). Pressing the card or the button asks to buy it (page.ts).
 */
function tile(ctx: RaidShopContext, item: RaidShopItem): HTMLElement {
  const box = el('div', 'raid-ware');
  box.dataset.item = item.id;

  const card = face(item, 'button');
  card.setAttribute('aria-label', `${item.name}, ${item.stars} stars: what it does`);
  const buy = el('button', 'action main raid-ware-buy');
  buy.type = 'button';
  const short = item.price > (ctx.view?.gems ?? 0);
  buy.append(...price(item.price, short));
  buy.setAttribute('aria-label', `Buy ${item.name} for ${points(item.price)} komaGems`);
  if (short) buy.setAttribute('aria-disabled', 'true');

  const name = el('span', 'raid-ware-name', item.name);
  name.title = item.name;
  box.append(card, name, el('span', 'raid-ware-owned', `Owned: ${item.owned}`), buy);
  return box;
}

/** The time until the shelf changes, in the strip. */
export function renderTimer(ctx: RaidShopContext): void {
  const { ui, view } = ctx;
  if (!view) return;
  ui.timer.replaceChildren(...until(view.resetsAt).flatMap(([n, unit]) => [el('b', '', String(n).padStart(2, '0')), el('span', '', unit)]));
}

/** Draws the tab as `ctx.view` has it: their komaGems, the strip (when the shelf changes, and refreshing it), and a tile for each item. */
export function render(ctx: RaidShopContext): void {
  const { ui, view } = ctx;
  ui.gems.hidden = !view;
  ui.strip.hidden = !view;
  ui.shelf.hidden = !view;
  if (!view) return;
  ui.gems.replaceChildren(...price(view.gems));
  renderTimer(ctx);

  const { max, left, price: next } = view.refresh;
  ui.refreshBox.hidden = max <= 0;
  // "Refreshes left: 5", or on a phone "5 left" (raid-shop.css shows one or the other).
  ui.refreshLeft.replaceChildren(el('span', 'raidshop-wide', 'Refreshes left: '), el('b', '', String(left)), el('span', 'raidshop-narrow', ' left'));
  ui.refresh.hidden = next === null;
  if (next !== null) {
    ui.refresh.replaceChildren(...price(next, next > view.gems));
    ui.refresh.toggleAttribute('aria-disabled', false);
    if (next > view.gems) ui.refresh.setAttribute('aria-disabled', 'true');
    ui.refresh.setAttribute('aria-label', `Refresh the shelf for ${points(next)} komaGems`);
  }

  ui.shelf.replaceChildren(...view.items.map((item) => tile(ctx, item)));
  if (view.items.length === 0) ui.shelf.append(el('p', 'raidshop-empty', 'Nothing is on the shelf this week.'));
  if (ctx.asking) renderAsk(ctx);
}

/** The box, for `ctx.asking`: what it is and what it costs, in red when that's more than they have (and then nothing to press). */
export function renderAsk(ctx: RaidShopContext): void {
  const { ui, view, asking } = ctx;
  if (!view || !asking) return;
  const item = asking.kind === 'buy' ? asking.item : null;
  const cost = item ? item.price : (view.refresh.price ?? 0);
  const short = cost - view.gems;

  ui.askArt.hidden = !item;
  ui.askEffects.hidden = !item;
  if (item) {
    ui.askArt.replaceChildren(face(item, 'span'));
    ui.askTitle.replaceChildren(`Buy ${item.name}?`, tierMark(item.stars));
    ui.askAbout.textContent = item.description;
    ui.askEffects.replaceChildren(
      ...item.effects.map((line) => {
        const row = el('li');
        row.append(rich(line));
        return row;
      }),
    );
  } else {
    ui.askTitle.replaceChildren('Refresh the shelf?');
    ui.askAbout.textContent = 'Everything on it is swapped for new gear, for you alone, until the week turns.';
  }
  ui.askPrice.replaceChildren(...price(cost, short > 0));
  ui.askPrice.title = `${points(cost)} komaGems (you have ${points(view.gems)})`;
  ui.askConfirm.textContent = item ? 'Buy' : 'Refresh';
  ui.askConfirm.disabled = short > 0;
  working(ui.askConfirm, ctx.busy, 'confirm');
}
