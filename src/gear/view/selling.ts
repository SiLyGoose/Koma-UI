import { askSale, saleOf, saleSaid } from '../../shared/items';
import { change } from './api';
import type { GearContext } from './context';
import { render } from './render';
import type { GearSold } from '../../protocol/gear';

/** How many copies are picked to sell, and what they sell for together (zeiucoins, and hero gear's gear powder). */
export const sale = (ctx: GearContext): { count: number; total: number; powder: number; ids: string[] } => saleOf(ctx.gear?.copies ?? [], ctx.selling);

/** Starts or stops picking copies to sell. */
export function pickToSell(ctx: GearContext, on: boolean): void {
  ctx.selling = on ? new Set() : null;
  ctx.picked = null;
  if (on) ctx.view = 'gear';
  render(ctx);
}

/** Asks to confirm selling what's picked. */
export function confirmSale(ctx: GearContext): void {
  const { count, total, powder } = sale(ctx);
  askSale(ctx.ui.sellConfirm, count, total, 0, powder);
}

/** Sells what's picked, and says what it came to. */
export async function sell(ctx: GearContext): Promise<void> {
  const copies = sale(ctx).ids;
  if (copies.length === 0) return;
  const view = await change<GearSold>(ctx, 'sell', '/api/gear/sell', { copies }, 'Could not sell those. Try again.');
  // It paid zeiucoins or gear powder (or whatever the refusal was, the balance may be old): the header's balance follows.
  void ctx.host.loadMe(true);
  if (!view) return;
  ctx.selling = null;
  render(ctx);
  if (view.sold) saleSaid(ctx.ui.status, view.sold);
}
