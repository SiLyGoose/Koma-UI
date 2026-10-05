import { mySeat, showingResults, type TableContext } from '../context';
import { renderPiles } from '../piles';
import type { Pile } from '../types';

/** Everyone's chips on every spot, and (once the round is out) how this page's came out. */
export function renderSpots<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  const { game, state, bets } = ctx;
  const results = showingResults(ctx);
  const mine = results ? mySeat(ctx)?.result : null;
  const outcomes = new Map((mine?.bets ?? []).map((b) => [b.spot, b.outcome]));
  for (const [spot, el] of game.spots) {
    const piles: Pile<S>[] = [];
    for (const seat of state?.seats ?? []) {
      const isMine = seat.userId === state?.you;
      const amount = (isMine ? bets[spot] : seat.bets[spot]) ?? 0;
      if (amount <= 0) continue;
      const outcome = results ? seat.result?.bets.find((b) => b.spot === spot)?.outcome : undefined;
      piles.push({ seat, amount, mine: isMine, outcome, refused: results && seat.refused });
    }
    (game.renderSpot ?? renderPiles)(el, piles, state?.chips ?? []);
    const outcome = outcomes.get(spot);
    el.classList.toggle('won', outcome === 'win');
    el.classList.toggle('lost', outcome === 'lose');
    el.classList.toggle('push', outcome === 'push');
    el.classList.toggle('has-chips', (bets[spot] ?? 0) > 0);
  }
}
