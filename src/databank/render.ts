import { renderBosses } from './bosses';
import { renderClasses } from './classes';
import type { DatabankContext, View } from './context';
import { renderDetail } from './detail';
import { renderHeroes } from './heroes';
import { renderHub, renderItemKinds } from './hub';
import { renderList } from './list';

const TITLES: Record<View, string> = {
  hub: 'Databank · Komaverse',
  itemKinds: 'Items · Databank · Komaverse',
  items: 'Items · Databank · Komaverse',
  bosses: 'Enemies · Databank · Komaverse',
  classes: 'Classes · Databank · Komaverse',
  heroes: 'Heroes · Databank · Komaverse',
};

/**
 * Draws the page as it is: the way in, or the items (the filters, the list and the panel), or the raid
 * bosses, classes or heroes (their list and the one picked). Over them, the server picker and, out of a section, the X.
 */
export function render(ctx: DatabankContext): void {
  const { ui, view } = ctx;
  if (!ctx.databank) return;
  // (The items' way in is the way in's star chart, with its two marks.)
  ui.hub.hidden = view !== 'hub' && view !== 'itemKinds';
  ui.databank.hidden = view !== 'items';
  ui.bosses.hidden = view !== 'bosses';
  ui.classes.hidden = view !== 'classes';
  ui.heroes.hidden = view !== 'heroes';
  document.title = TITLES[view];
  ui.bar.hidden = false;
  ui.close.hidden = view === 'hub';
  // Out of a list of items, back to the items' way in; out of anything else, to the way in.
  ui.close.href = view === 'items' ? '/databank/items/' : '/databank/';
  ui.close.setAttribute('aria-label', view === 'items' ? 'Back to the Items' : 'Back to the Databank');
  ui.title.hidden = view !== 'hub' && view !== 'itemKinds';
  ui.title.textContent = view === 'itemKinds' ? 'Items' : 'Databank';
  if (view === 'hub') return renderHub(ctx);
  if (view === 'itemKinds') return renderItemKinds(ctx);
  if (view === 'bosses') return renderBosses(ctx);
  if (view === 'classes') return renderClasses(ctx);
  if (view === 'heroes') return renderHeroes(ctx);
  // The Class group only with a bot that has classes.
  const classes = ctx.databank.classes ?? [];
  ui.filter.show({ slot: ctx.slotFilter, stars: ctx.starFilter, owned: ctx.owned === null ? null : ctx.onlyOwned, refineable: null, cls: classes.length > 0 ? ctx.classFilter : null, heroGear: null, sort: null });
  renderList(ctx);
  renderDetail(ctx);
}
