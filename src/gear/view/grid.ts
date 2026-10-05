import { armoryOrder, equippedIds } from '../../shared/items/gear';
import { el, itemFace, lockBadge, SLOT_NAME } from '../../shared/items/items';
import { hoverSound, itemPicked } from '../../shared/items/sfx';
import { mine, type GearContext } from './context';
import { renderDetail } from './detail';
import { renderFoot } from './foot';

/** The armory always shows at least this many cells (rounded up to a full row), and fills out its last row. */
const GRID_CELLS = 12;

/** How many cards across the armory is now. */
export const columns = (ctx: GearContext): number => getComputedStyle(ctx.ui.grid).gridTemplateColumns.split(' ').length || 4;

/** The armory: every copy shown (by the filter), then blanks to fill out the last row. */
export function renderGrid(ctx: GearContext): void {
  const { gear, ui, selling, filter, viewing } = ctx;
  if (!gear) return;
  // Measured before emptying the grid, and the sheet's scroll put back after: a layout of the empty
  // grid would scroll the sheet back to the top on every pick.
  ctx.gridColumns = columns(ctx);
  const sheet = ui.grid.parentElement as HTMLElement;
  const scrolled = sheet.scrollTop;
  ui.grid.textContent = '';
  const shown = armoryOrder(gear.copies).filter((c) => filter === 'all' || c.slot === filter);
  ui.grid.classList.toggle('selling', selling !== null);
  const equipped = equippedIds(gear);
  for (const copy of shown) {
    const card = el('button', 'item');
    card.type = 'button';
    card.dataset.stars = String(copy.stars);
    // While picking what to sell, the one shown is marked only by the sale's red ring.
    card.classList.toggle('picked', !selling && copy.id === ctx.picked);
    card.classList.toggle('masterwork', copy.masterwork);
    card.setAttribute('aria-label', `${copy.name}, ${copy.stars} star${copy.stars === 1 ? '' : 's'}, R${copy.level}${equipped.has(copy.id) ? ', equipped' : ''}${copy.locked ? ', locked' : ''}`);
    // Worn, or saved in any of their loadouts.
    if (equipped.has(copy.id)) card.append(el('span', 'item-tag', 'Equipped'));
    else if (selling && copy.sell === null && !copy.locked) card.append(el('span', 'item-tag', 'In loadout'));
    card.append(...itemFace(copy));
    if (copy.locked) card.append(lockBadge());
    if (selling) {
      // Worn, saved in a loadout or locked: never sold, so not to be picked.
      const sellable = typeof copy.sell === 'number';
      const on = selling.has(copy.id);
      card.disabled = !sellable || ctx.busy;
      card.classList.toggle('unsellable', !sellable);
      card.classList.toggle('to-sell', on);
      card.setAttribute('aria-pressed', String(on));
      if (on) card.append(el('span', 'item-check', '✓'));
    }
    card.dataset.sfx = 'own';
    hoverSound(card, copy.id, () => !card.disabled);
    card.addEventListener('click', () => pickCard(ctx, copy.id));
    ui.grid.append(card);
  }
  const row = (n: number): number => Math.ceil(n / ctx.gridColumns) * ctx.gridColumns;
  const cells = Math.max(row(GRID_CELLS), row(shown.length));
  for (let i = shown.length; i < cells; i++) ui.grid.append(el('span', 'item blank'));
  if (shown.length === 0) {
    const none = viewing && !mine(ctx) ? `${viewing.name} doesn't own any gear yet.` : "You don't own any gear yet. Pull some with Koma's gacha in Discord.";
    const note = el('p', 'armory-empty', filter === 'all' ? none : `No ${SLOT_NAME[filter].toLowerCase()} yet.`);
    ui.grid.append(note);
  }
  sheet.scrollTop = scrolled;
}

/** A card clicked: shows what it does (again: hides it), or, picking what to sell, picks it to sell. */
function pickCard(ctx: GearContext, id: string): void {
  // Its sound, and the details' when they show it (opened, or switched to it).
  const before = ctx.picked;
  const sound = (): void => itemPicked(before, ctx.picked);
  // Picking what to sell: the one picked last is shown over the character (unpicking it shows the one before).
  const { selling } = ctx;
  if (selling) {
    if (selling.delete(id)) {
      if (ctx.picked === id) ctx.picked = [...selling].at(-1) ?? null;
    } else {
      selling.add(id);
      ctx.picked = id;
    }
    renderGrid(ctx);
    renderDetail(ctx);
    renderFoot(ctx);
    sound();
    return;
  }
  ctx.picked = ctx.picked === id ? null : id;
  renderGrid(ctx);
  renderDetail(ctx);
  sound();
}
