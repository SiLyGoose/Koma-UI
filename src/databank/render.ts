import { renderBosses } from './bosses';
import { renderClasses } from './classes';
import type { DatabankContext, View } from './context';
import { renderDetail } from './detail';
import { renderHub } from './hub';
import { renderList } from './list';

const TITLES: Record<View, string> = {
  hub: 'Databank · Komaverse',
  items: 'Items · Databank · Komaverse',
  bosses: 'Raid Bosses · Databank · Komaverse',
  classes: 'Classes · Databank · Komaverse',
};

/**
 * Draws the page as it is: the way in, or the items (the filters, the list and the panel), or the raid
 * bosses or classes (their list and the one picked). Over them, the server picker and, out of a section, the X.
 */
export function render(ctx: DatabankContext): void {
  const { ui, view } = ctx;
  if (!ctx.databank) return;
  ui.hub.hidden = view !== 'hub';
  ui.databank.hidden = view !== 'items';
  ui.bosses.hidden = view !== 'bosses';
  ui.classes.hidden = view !== 'classes';
  document.title = TITLES[view];
  ui.bar.hidden = false;
  ui.close.hidden = view === 'hub';
  ui.bar.classList.toggle('empty', ui.close.hidden && ui.server.hidden);
  if (view === 'hub') return renderHub(ctx);
  if (view === 'bosses') return renderBosses(ctx);
  if (view === 'classes') return renderClasses(ctx);
  // The Class group only with a bot that has classes.
  const classes = ctx.databank.classes ?? [];
  ui.filter.show({ slot: ctx.slotFilter, stars: ctx.starFilter, owned: ctx.owned === null ? null : ctx.onlyOwned, refineable: null, cls: classes.length > 0 ? ctx.classFilter : null });
  renderList(ctx);
  renderDetail(ctx);
}
