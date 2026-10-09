import { characterOf } from '../shared/characters';
import { el } from '../shared/items';
import { working } from '../shared/ui';
import { coin, points } from '../shared/util';
import type { Outfit } from '../shared/outfits';
import type { OutfitsContext } from './context';

/** What a card shows at the bottom: its price, to buy it (`short` when they can't pay), or that it's theirs (nothing to press). */
type CardState = 'buy' | 'short' | 'owned';

function stateOf(ctx: OutfitsContext, outfit: Outfit): CardState {
  if (outfit.owned) return 'owned';
  return outfit.price <= (ctx.view?.balance ?? 0) ? 'buy' : 'short';
}

/** An amount of zeiucoins: the coin, then the number. */
const price = (amount: number): HTMLElement[] => [coin('outfit-coin', 'zeiucoins'), el('span', '', points(amount))];

/** One outfit's card: its character standing on its floor, its name, and at the bottom its price or that it's theirs. */
function card(ctx: OutfitsContext, outfit: Outfit): HTMLButtonElement {
  const state = stateOf(ctx, outfit);
  const button = el('button', 'outfit-card');
  button.type = 'button';
  button.dataset.outfit = outfit.id;
  button.dataset.state = state;
  if (state === 'owned') button.setAttribute('aria-disabled', 'true');

  const sprite = el('img', 'outfit-sprite');
  sprite.src = characterOf(outfit.id).sprite;
  sprite.alt = '';
  sprite.draggable = false;
  const art = el('span', 'outfit-art');
  art.append(el('span', 'outfit-floor'), sprite);

  const foot = el('span', 'outfit-foot');
  if (state === 'owned') foot.append(el('span', 'outfit-check', '✓'), el('span', '', 'Owned'));
  else foot.append(...price(outfit.price));

  button.append(art, el('span', 'outfit-name', outfit.name), foot);
  button.setAttribute('aria-label', state === 'owned' ? `${outfit.name}: owned` : `${outfit.name}: ${points(outfit.price)} zeiucoins`);
  return button;
}

/** Draws the tab as `ctx.view` has it: their zeiucoins, and a card for each outfit. */
export function render(ctx: OutfitsContext): void {
  const { ui, view } = ctx;
  ui.balance.hidden = !view;
  ui.list.hidden = !view;
  if (!view) return;
  ui.balance.replaceChildren(...price(view.balance));
  ui.list.replaceChildren(...view.outfits.map((outfit) => card(ctx, outfit)));
  if (ctx.buying) renderBuy(ctx);
}

/** The buy box, for `ctx.buying`: what it costs, and how much they're short when they are. */
export function renderBuy(ctx: OutfitsContext): void {
  const { ui, view, buying } = ctx;
  if (!view || !buying) return;
  const left = view.balance - buying.price;
  ui.buySprite.src = characterOf(buying.id).sprite;
  ui.buyTitle.textContent = `Buy ${buying.name}?`;
  ui.buyPrice.replaceChildren(...price(buying.price));
  ui.buyNote.hidden = left >= 0;
  ui.buyNote.textContent = left >= 0 ? '' : `You have ${points(view.balance)}: ${points(-left)} short.`;
  ui.buyConfirm.disabled = left < 0;
  working(ui.buyConfirm, ctx.busy, 'buy');
}
