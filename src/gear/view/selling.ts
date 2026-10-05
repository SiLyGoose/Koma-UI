import { coin } from '../../shared/coin';
import { points } from '../../shared/format';
import { change } from './api';
import { copyById, type GearContext } from './context';
import { render } from './render';

/** How many copies are picked to sell, and what they sell for together. */
export function sale(ctx: GearContext): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const id of ctx.selling ?? []) {
    const price = copyById(ctx, id)?.sell;
    if (typeof price !== 'number') continue;
    count++;
    total += price;
  }
  return { count, total };
}

/** Starts or stops picking copies to sell. */
export function pickToSell(ctx: GearContext, on: boolean): void {
  ctx.selling = on ? new Set() : null;
  ctx.picked = null;
  if (on) ctx.view = 'gear';
  render(ctx);
}

/** Asks to confirm selling what's picked. */
export function confirmSale(ctx: GearContext): void {
  const { count, total } = sale(ctx);
  if (count === 0) return;
  const dialog = ctx.ui.sellConfirm;
  const title = dialog.querySelector('h3') as HTMLElement;
  title.textContent = `Sell ${count} item${count === 1 ? '' : 's'}?`;
  const amount = dialog.querySelector('.sell-confirm-total') as HTMLElement;
  amount.textContent = '';
  amount.append(`+${points(total)} `, coin('coin', 'zeiucoins'));
  dialog.showModal();
}

/** Sells what's picked, and says what it came to. */
export async function sell(ctx: GearContext): Promise<void> {
  const copies = [...(ctx.selling ?? [])].filter((id) => typeof copyById(ctx, id)?.sell === 'number');
  if (copies.length === 0) return;
  const view = await change(ctx, '/api/gear/sell', { copies }, 'Could not sell those. Try again.');
  // It paid zeiucoins (or whatever the refusal was, the balance may be old): the header's balance follows.
  void ctx.host.loadMe(true);
  if (!view) return;
  ctx.selling = null;
  render(ctx);
  if (view.sold) {
    ctx.ui.status.hidden = false;
    ctx.ui.status.append(`Sold ${view.sold.count} item${view.sold.count === 1 ? '' : 's'} for ${points(view.sold.earned)} `, coin('coin', 'zeiucoins'));
  }
}
