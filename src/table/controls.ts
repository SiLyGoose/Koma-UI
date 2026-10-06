import { place, sendBets, spotsIn, startDrag, takeBack, whyNot } from './chips';
import { send } from './connection';
import { busy, mySeat, onTable, showError, type TableContext } from './context';
import { render } from './render';
import { play } from './sfx';

/** The spots (tap, drag, right-click) and the panel's buttons. */
export function wireControls<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  const { ui, game } = ctx;

  // A bet placed, taken back, undone or cleared has the chips' own sound, not the plain click's.
  for (const el of [...game.spots.values(), ui.undo, ui.clear]) el.dataset.sfx = 'own';
  for (const [spot, el] of game.spots) {
    el.addEventListener('pointerdown', (e) => {
      // Dragging this page's stack off a spot; a tap bets the picked chip (see startDrag).
      if (ctx.bets[spot]) startDrag(ctx, e, { from: 'spot', spot });
    });
    el.addEventListener('click', (e) => {
      // Taps on a spot without this page's chips (one with them handles its own, in startDrag), and keyboard presses.
      if (ctx.bets[spot] && e.detail !== 0) return;
      place(ctx, spot, ctx.selected);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      takeBack(ctx, spot);
    });
  }

  ui.undo.addEventListener('click', () => {
    if (busy(ctx)) return;
    const last = ctx.history.pop();
    if (!last) return;
    const left = (ctx.bets[last.spot] ?? 0) - last.amount;
    ctx.bets = { ...ctx.bets, [last.spot]: left };
    if (left <= 0) delete ctx.bets[last.spot];
    play('move');
    showError(ctx, null);
    sendBets(ctx);
    render(ctx);
  });

  ui.clear.addEventListener('click', () => {
    if (busy(ctx) || onTable(ctx) === 0) return;
    play('move');
    ctx.bets = {};
    ctx.history = [];
    showError(ctx, null);
    sendBets(ctx);
    render(ctx);
  });

  ui.rebet.addEventListener('click', () => {
    const last = mySeat(ctx)?.lastBets;
    if (busy(ctx) || !last) return;
    for (const [spot, amount] of spotsIn(last)) place(ctx, spot, amount);
  });

  ui.dealVote.addEventListener('click', () => {
    if (busy(ctx)) return;
    send(ctx, { t: 'deal', ready: !(mySeat(ctx)?.ready ?? false) });
  });

  ui.double.addEventListener('click', () => {
    if (busy(ctx)) return;
    const problem = whyNot(ctx, onTable(ctx) * 2);
    if (problem) return showError(ctx, problem);
    for (const [spot, amount] of spotsIn(ctx.bets)) place(ctx, spot, amount);
  });
}
