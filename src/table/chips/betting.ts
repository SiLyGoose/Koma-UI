import { points, replay } from '../../shared/util';
import { send } from '../connection';
import { balance, busy, onTable, showError, type TableContext } from '../context';
import type { Bets } from '../protocol';
import { render } from '../render';
import { play } from '../sfx';

/** Whether this page's chips could come to `total`: within the table's limit and their balance. */
export function fits<S extends string, R, X>(ctx: TableContext<S, R, X>, total: number): boolean {
  if (!ctx.state) return false;
  const have = balance(ctx);
  return total <= ctx.state.maxBet && (have === null || total <= have);
}

/** Why a chip can't go down, or null if it can. */
export function whyNot<S extends string, R, X>(ctx: TableContext<S, R, X>, total: number): string | null {
  const { state } = ctx;
  if (!state) return 'Connecting…';
  if (state.phase !== 'betting') return 'Wait for the next round to bet.';
  if (total > state.maxBet) return `The most on the table is ${points(state.maxBet)} a round.`;
  const have = balance(ctx);
  if (have !== null && total > have) return `You only have ${points(have)}.`;
  return null;
}

/** Sends this page's chips to the bot (which shows them to the table). */
export function sendBets<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  ctx.seq += 1;
  send(ctx, { t: 'bets', bets: ctx.bets, seq: ctx.seq });
}

/** Puts `amount` more on `spot`, if it can go down. */
export function place<S extends string, R, X>(ctx: TableContext<S, R, X>, spot: S, amount: number): void {
  if (amount <= 0) return;
  if (busy(ctx)) {
    if (!ctx.watching && ctx.state?.phase === 'dealing') showError(ctx, 'Wait for the next round to bet.');
    return;
  }
  const problem = whyNot(ctx, onTable(ctx) + amount);
  if (problem) {
    showError(ctx, problem);
    const el = ctx.game.spots.get(spot);
    if (el) replay(el, 'shake');
    return;
  }
  showError(ctx, null);
  ctx.bets = { ...ctx.bets, [spot]: (ctx.bets[spot] ?? 0) + amount };
  ctx.history.push({ spot, amount });
  play('place');
  sendBets(ctx);
  render(ctx);
  const stack = ctx.game.spots.get(spot)?.querySelector('.tb-stack');
  stack?.lastElementChild?.previousElementSibling?.classList.add('drop');
}

/** Takes every chip of this page's off `spot` (back to the rack). */
export function takeBack<S extends string, R, X>(ctx: TableContext<S, R, X>, spot: S, withSound = true): void {
  if (busy(ctx) || !(ctx.bets[spot] ?? 0)) return;
  const rest = { ...ctx.bets };
  delete rest[spot];
  ctx.bets = rest;
  ctx.history = ctx.history.filter((h) => h.spot !== spot);
  if (withSound) play('move');
  showError(ctx, null);
  sendBets(ctx);
  render(ctx);
}

/** Every spot with chips on in `b`, and how many. */
export const spotsIn = <S extends string>(b: Bets<S>): [S, number][] => (Object.entries(b) as [S, number | undefined][]).filter((e): e is [S, number] => (e[1] ?? 0) > 0);
