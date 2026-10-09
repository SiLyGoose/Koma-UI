import { armoryOrder, el, equippedIds, forgePlan, itemFace, lockBadge, matchesSearch, matchesStars, SLOT_NAME } from '../shared/items';
import { choosing, copyById, type ForgeContext } from './context';
import { pick, pickMaterial } from './picking';

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** How many cards across the armory is now. */
export const columns = (ctx: ForgeContext): number => getComputedStyle(ctx.ui.grid).gridTemplateColumns.split(' ').length || 4;

/** The armory: every copy shown (by the filter, the stars and the search), greyed out when it can't go on the anvil now, then blanks to fill out the last row. */
export function renderGrid(ctx: ForgeContext): void {
  const { gear, ui, filter, stars, query, picked, material } = ctx;
  if (!gear) return;
  // Measured before emptying the grid, and the sheet's scroll put back after: a layout of the empty
  // grid would scroll the sheet back to the top on every pick.
  ctx.gridColumns = columns(ctx);
  const sheet = ui.grid.parentElement as HTMLElement;
  const scrolled = sheet.scrollTop;
  ui.grid.textContent = '';
  // Picking material: everything that can't be used up is greyed out and can't be picked.
  const usable = choosing(ctx);
  const ofSlot = armoryOrder(gear.copies).filter((c) => filter === 'all' || c.slot === filter);
  const shown = ofSlot.filter((c) => matchesStars(stars, c.stars) && matchesSearch(query, { name: c.name, id: c.itemId, description: c.description }));
  const target = copyById(ctx, picked);
  const plan = target ? forgePlan(target).kind : null;
  const equipped = equippedIds(gear);
  for (const copy of shown) {
    const button = el('button', 'item');
    button.type = 'button';
    button.dataset.stars = String(copy.stars);
    const isTarget = copy.id === picked;
    const isMaterial = copy.id === material;
    const unusable = usable !== null && !isTarget && !usable.has(copy.id);
    // The copy on the anvil stays in its place, darkened and named for what's being done to it.
    button.classList.toggle('selected', isTarget);
    button.classList.toggle('material', isMaterial);
    button.classList.toggle('masterwork', copy.masterwork);
    button.disabled = unusable;
    button.setAttribute('aria-label', `${copy.name}, ${copy.stars} star${copy.stars === 1 ? '' : 's'}, R${copy.level}${equipped.has(copy.id) ? ', equipped' : ''}${copy.locked ? ', locked' : ''}${isTarget ? ', on the anvil' : isMaterial ? ', material' : ''}`);
    if (isMaterial) button.append(el('span', 'item-tag', 'Material'));
    // Worn, or saved in any of their loadouts.
    else if (equipped.has(copy.id)) button.append(el('span', 'item-tag', 'Equipped'));
    button.append(...itemFace(copy));
    if (copy.locked) button.append(lockBadge());
    if (isTarget) button.append(el('span', 'item-selected', plan === 'refine' ? 'Refining' : plan === 'forge' ? 'Forging' : 'Selected'));
    button.addEventListener('click', () => (usable?.has(copy.id) ? pickMaterial(ctx, copy) : pick(ctx, copy)));
    ui.grid.append(button);
  }
  const row = (n: number): number => Math.ceil(n / ctx.gridColumns) * ctx.gridColumns;
  const cells = Math.max(row(GRID_CELLS), row(shown.length));
  for (let i = shown.length; i < cells; i++) ui.grid.append(el('span', 'item blank'));
  if (shown.length === 0) {
    const note = el(
      'p',
      'armory-empty',
      ofSlot.length > 0 ? 'No items match that.' : filter === 'all' ? "You don't own any gear yet. Pull some with Koma's gacha in Discord." : `No ${SLOT_NAME[filter].toLowerCase()} yet.`,
    );
    ui.grid.append(note);
  }
  sheet.scrollTop = scrolled;
}
