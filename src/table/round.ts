import { coin } from '../shared/coin';
import { mySeat, type TableContext } from './context';
import { signedPoints } from './format';
import type { RoundOf } from './protocol';
import { render } from './render';
import { play } from './sfx';

function clearRound<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  ctx.game.clear();
  ctx.ui.result.hidden = true;
  ctx.ui.felt.classList.remove('last-round');
}

/** Shows a round at once: faded (the last round, while the next one takes bets), or with how it went. */
export function showRound<S extends string, R, X>(ctx: TableContext<S, R, X>, round: RoundOf<R>, faded: boolean): void {
  ctx.playing += 1;
  ctx.dealingOut = false;
  ctx.shownRound = round.no;
  clearRound(ctx);
  ctx.game.show(round);
  if (faded) {
    ctx.ui.felt.classList.add('last-round');
    return;
  }
  ctx.game.reveal(round);
  showResult(ctx, round);
}

/** Plays `round` out on the felt, then shows how it went. */
export async function playOut<S extends string, R, X>(ctx: TableContext<S, R, X>, round: RoundOf<R>): Promise<void> {
  const mine = ++ctx.playing;
  ctx.dealingOut = true;
  ctx.shownRound = round.no;
  clearRound(ctx);
  render(ctx);
  await ctx.game.animate(round, () => mine === ctx.playing);
  if (mine !== ctx.playing) return;
  ctx.dealingOut = false;
  ctx.game.reveal(round);
  showResult(ctx, round);
  render(ctx);
}

/** How the round went for this page's player: what they won or lost, or that they sat it out. */
function showResult<S extends string, R, X>(ctx: TableContext<S, R, X>, round: RoundOf<R>): void {
  const { ui } = ctx;
  const text = ctx.game.describe(round);
  const me = mySeat(ctx);
  const net = me?.result?.net ?? null;
  if (net === null) {
    // No chips down (or refused): just how the round went.
    ui.result.classList.remove('lost');
    ui.result.classList.add('even');
    ui.resultTitle.textContent = me?.refused ? 'Bet refused' : 'Sat out';
  } else {
    ui.result.classList.toggle('lost', net < 0);
    ui.result.classList.toggle('even', net === 0);
    ui.resultTitle.textContent = signedPoints(net);
    ui.resultTitle.append(' ', coin());
    play(net > 0 ? 'win' : net < 0 ? 'lose' : 'even');
  }
  ui.resultText.textContent = text;
  ui.result.hidden = false;
}
