import type { TableContext } from '../context';
import { renderBar } from './bar';
import { renderPlayers } from './players';
import { renderSpots } from './spots';
import { renderTimer } from './timer';

/** Draws the whole table: the chips on the spots, the players, the panel and the timer, then the game's own. */
export function render<S extends string, R, X>(ctx: TableContext<S, R, X>): void {
  renderSpots(ctx);
  renderPlayers(ctx);
  renderBar(ctx);
  renderTimer(ctx);
  if (ctx.state) ctx.game.render?.(ctx.state);
}

export { renderBar, renderTimer };
