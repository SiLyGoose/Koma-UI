import type { DatabankContext } from './context';
import { renderDetail } from './detail';
import { renderList } from './list';

/** Draws the whole page: the filters, the list and the panel. */
export function render(ctx: DatabankContext): void {
  const { ui } = ctx;
  ui.databank.hidden = false;
  for (const tab of ui.tabs) tab.setAttribute('aria-selected', String(tab.dataset.filter === ctx.slotFilter));
  for (const chip of ui.chips) chip.setAttribute('aria-pressed', String(chip.dataset.starsFilter === String(ctx.starFilter)));
  ui.ownedOnly.hidden = ctx.owned === null;
  ui.ownedOnly.setAttribute('aria-pressed', String(ctx.onlyOwned));
  renderList(ctx);
  renderDetail(ctx);
}
