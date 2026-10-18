import { art, el, hoverSound, itemPicked, kindName, tierMark, tmMarks, tmTier, utMarks, utTier, uwMarks, uwTier } from '../shared/items';
import { classBadge } from './class-tag';
import { className, itemsOfKind, type DatabankContext } from './context';
import { renderDetail } from './detail';
import { matches } from './filter';
import type { DatabankItem, Stars } from './types';

/** The tiers, best first: TechnoMagic gear (a tier of its own, above 4 stars), the unique weapons, the unique treasures, then 4 stars down to 1. */
const TIERS: readonly (Stars | 'tm' | 'uw' | 'ut')[] = ['tm', 'uw', 'ut', 4, 3, 2, 1];
const tierOfItem = (item: DatabankItem): Stars | 'tm' | 'uw' | 'ut' => (item.source === 'technomagic' ? 'tm' : item.uniqueTreasure ? 'ut' : item.source === 'heroBanner' ? 'uw' : item.stars);
const ofTier = (item: DatabankItem, tier: Stars | 'tm' | 'uw' | 'ut'): boolean => tierOfItem(item) === tier;

/** Every item shown, by tier, and how many there are. */
export function renderList(ctx: DatabankContext): void {
  const { databank, ui, owned } = ctx;
  if (!databank) return;
  ui.list.textContent = '';
  // (Only its kind's: a hero's gear, or the members' own.)
  const all = itemsOfKind(ctx, ctx.itemKind);
  const shown = all.filter((item) => matches(ctx, item));
  for (const tier of TIERS) {
    const items = shown.filter((item) => ofTier(item, tier));
    if (items.length === 0) continue;
    const section = el('section', 'db-tier');
    section.dataset.stars = String(tier);
    const head = el('h3', 'db-tier-head');
    // (TechnoMagic gear's heading, and the unique weapons', is its tier alone, with no count.)
    if (tier === 'tm') head.append(tmTier());
    else if (tier === 'uw') head.append(uwTier());
    else if (tier === 'ut') head.append(utTier());
    else head.append(tierMark(tier), el('span', '', `${items.length} item${items.length === 1 ? '' : 's'}`));
    const grid = el('div', 'armory-grid');
    for (const item of items) grid.append(card(ctx, item));
    section.append(head, grid);
    ui.list.append(section);
  }
  if (shown.length === 0) ui.list.append(el('p', 'db-empty', ctx.onlyOwned && owned?.size === 0 ? "You don't own any gear here yet." : 'No items match that.'));
  const total = all.length;
  ui.count.textContent = shown.length === total ? `${total} items` : `${shown.length} of ${total} items`;
  if (owned) ui.count.textContent += ` · you own ${all.filter((item) => owned.has(item.id)).length}`;
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
  const cls = item.class ? className(ctx, item.class) : null;
  button.setAttribute('aria-label', `${item.name}, ${item.stars} star${item.stars === 1 ? '' : 's'}, ${kindName(item)}${cls ? `, ${cls} class item` : ''}${mine ? `, you own ${mine.count}` : ''}`);
  // How many they own, in the corner (not on TechnoMagic gear or a unique weapon: its corners are its tabs').
  const tm = item.source === 'technomagic';
  const uw = item.source === 'heroBanner' && item.uniqueWeapon ? item.uniqueWeapon : null;
  const ut = item.source === 'heroBanner' && item.uniqueTreasure ? item.uniqueTreasure : null;
  if (mine && !tm && !uw && !ut) button.append(el('span', 'item-level', `×${mine.count}`));
  // TechnoMagic gear is drawn as the raid's own (its class in its corner tab); any other class item wears its class's badge in the corner.
  if (item.class && cls && !tm) button.append(classBadge(item.class, cls));
  // (TechnoMagic gear and a unique weapon have no stars, but their marks.)
  const picture = art(item.id, item.slot, true);
  if (tm) button.append(picture, el('span', 'db-name', item.name), ...tmMarks(item.class));
  else if (uw) button.append(picture, el('span', 'db-name', item.name), ...uwMarks(uw));
  else if (ut) button.append(picture, el('span', 'db-name', item.name), ...utMarks(ut.hero));
  else button.append(tierMark(item.stars), picture, el('span', 'db-name', item.name), el('span', 'item-curl'));
  button.dataset.sfx = 'own';
  hoverSound(button, item.id);
  button.addEventListener('click', () => {
    // Its sound, and the details' as they show it (opened, or switched to it).
    const opened = ctx.picked !== item.id || !ctx.sheetOpen;
    ctx.picked = item.id;
    ctx.sheetOpen = true;
    // Only the ring moves (the list as it is, its pictures and all).
    for (const other of ctx.ui.list.querySelectorAll('.db-item.picked')) other.classList.remove('picked');
    button.classList.add('picked');
    renderDetail(ctx);
    itemPicked(opened ? null : item.id, item.id);
  });
  return button;
}
