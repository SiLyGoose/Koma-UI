import type { DatabankContext } from './context';
import { renderDetail } from './detail';
import { renderList } from './list';

/** Draws the whole page: the filters, the list and the panel. */
export function render(ctx: DatabankContext): void {
  const { ui } = ctx;
  ui.databank.hidden = false;
  ui.filter.show({ slot: ctx.slotFilter, stars: ctx.starFilter, owned: ctx.owned === null ? null : ctx.onlyOwned });
  renderList(ctx);
  renderDetail(ctx);
}
