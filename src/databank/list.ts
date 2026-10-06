import { art, el, hoverSound, itemPicked, SLOT_NAME, stars } from '../shared/items';
import type { DatabankContext } from './context';
import { renderDetail } from './detail';
import { matches } from './filter';
import type { DatabankItem, Stars } from './types';

const TIERS: readonly Stars[] = [4, 3, 2, 1];

/** Every item shown, by star tier, and how many there are. */
export function renderList(ctx: DatabankContext): void {
  const { databank, ui, owned } = ctx;
  if (!databank) return;
  ui.list.textContent = '';
  const shown = databank.items.filter((item) => matches(ctx, item));
  for (const tier of TIERS) {
    const items = shown.filter((item) => item.stars === tier);
    if (items.length === 0) continue;
    const section = el('section', 'db-tier');
    section.dataset.stars = String(tier);
    const head = el('h3', 'db-tier-head');
    head.append(stars(tier), el('span', '', `${items.length} item${items.length === 1 ? '' : 's'}`));
    const grid = el('div', 'armory-grid');
    for (const item of items) grid.append(card(ctx, item));
    section.append(head, grid);
    ui.list.append(section);
  }
  if (shown.length === 0) ui.list.append(el('p', 'db-empty', ctx.onlyOwned && owned?.size === 0 ? "You don't own any gear here yet." : 'No items match that.'));
  const total = databank.items.length;
  ui.count.textContent = shown.length === total ? `${total} items` : `${shown.length} of ${total} items`;
  if (owned) ui.count.textContent += ` · you own ${databank.items.filter((item) => owned.has(item.id)).length}`;
}

/** An item's card: picking it shows it in the panel. */
function card(ctx: DatabankContext, item: DatabankItem): HTMLButtonElement {
  const { owned } = ctx;
  const mine = owned?.get(item.id);
  const button = el('button', 'item db-item');
  button.type = 'button';
  button.dataset.stars = String(item.stars);
  button.classList.toggle('picked', item.id === ctx.picked);
  button.classList.toggle('unowned', owned !== null && !mine);
  button.setAttribute('aria-label', `${item.name}, ${item.stars} star${item.stars === 1 ? '' : 's'}, ${SLOT_NAME[item.slot]}${mine ? `, you own ${mine.count}` : ''}`);
  if (mine) button.append(el('span', 'item-level', `×${mine.count}`));
  button.append(stars(item.stars), art(item.id, item.slot), el('span', 'db-name', item.name), el('span', 'item-curl'));
  button.dataset.sfx = 'own';
  hoverSound(button, item.id);
  button.addEventListener('click', () => {
    // Its sound, and the details' as they show it (opened, or switched to it).
    const opened = ctx.picked !== item.id || !ctx.sheetOpen;
    ctx.picked = item.id;
    ctx.sheetOpen = true;
    renderList(ctx);
    renderDetail(ctx);
    itemPicked(opened ? null : item.id, item.id);
  });
  return button;
}
