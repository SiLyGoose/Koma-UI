import { renderBosses } from './bosses';
import type { DatabankContext, View } from './context';
import { renderDetail } from './detail';
import { renderHub } from './hub';
import { renderList } from './list';

const TITLES: Record<View, string> = {
  hub: 'Databank · Komaverse',
  items: 'Items · Databank · Komaverse',
  bosses: 'Raid Bosses · Databank · Komaverse',
};

/**
 * Draws the page as it is: the way in, or the items (the filters, the list and the panel), or the raid
 * bosses (their list and the one picked). Over them, the server picker and, out of a section, the X.
 */
export function render(ctx: DatabankContext): void {
  const { ui, view } = ctx;
  if (!ctx.databank) return;
  ui.hub.hidden = view !== 'hub';
  ui.databank.hidden = view !== 'items';
  ui.bosses.hidden = view !== 'bosses';
  document.title = TITLES[view];
  ui.bar.hidden = false;
  ui.close.hidden = view === 'hub';
  ui.bar.classList.toggle('empty', ui.close.hidden && ui.server.hidden);
  if (view === 'hub') return renderHub(ctx);
  if (view === 'bosses') return renderBosses(ctx);
  ui.filter.show({ slot: ctx.slotFilter, stars: ctx.starFilter, owned: ctx.owned === null ? null : ctx.onlyOwned, refineable: null });
  renderList(ctx);
  renderDetail(ctx);
}
