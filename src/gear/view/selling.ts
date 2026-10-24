import { askSale, saleOf, saleSaid, sellInTurns } from '../../shared/items';
import { change } from './api';
import type { GearContext } from './context';
import { render } from './render';
import type { GearSold } from '../../protocol/gear';

/** How many copies are picked to sell, what they sell for together (zeiucoins), and what salvaging them gives (komaDust). */
export const sale = (ctx: GearContext): ReturnType<typeof saleOf> => saleOf(ctx.gear?.copies ?? [], ctx.selling);

/** Starts or stops picking copies to sell. */
export function pickToSell(ctx: GearContext, on: boolean): void {
  ctx.selling = on ? new Set() : null;
  ctx.picked = null;
  if (on) ctx.view = 'gear';
  render(ctx);
}

/** Asks to confirm selling what's picked (`salvage`: salvaging it). */
export function confirmSale(ctx: GearContext, salvage = false): void {
  const { count, total, dust, stones, crystals } = sale(ctx);
  askSale(ctx.ui.sellConfirm, count, salvage ? dust : total, 0, salvage, { stones, crystals });
}

/** Sells what's picked (`salvage`: salvages it for komaDust), and says what it came to. */
export async function sell(ctx: GearContext, salvage = false): Promise<void> {
  const copies = sale(ctx).ids;
  if (copies.length === 0) return;
  // (A big sale in turns, the bot's at most SALE_TURN each.)
  const { sold, stopped } = await sellInTurns(copies, async (turn) =>
    (await change<GearSold>(ctx, salvage ? 'salvage' : 'sell', '/api/gear/sell', { copies: turn, ...(salvage && { salvage }) }, `Could not ${salvage ? 'salvage' : 'sell'} those. Try again.`))?.sold ?? null,
  );
  // It paid zeiucoins or komaDust (or whatever the refusal was, the balance may be old): the header's balance follows.
  void ctx.host.loadMe(true);
  if (!sold) return;
  ctx.selling = null;
  render(ctx);
  saleSaid(ctx.ui.status, sold, stopped);
}
