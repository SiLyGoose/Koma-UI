import { coin } from '../../shared/coin';
import { points } from '../../shared/format';
import { art, el, SLOT_NAME, type Slot } from '../../shared/items/items';
import { switchTo } from './api';
import { copyById, mine, wearOnly, type GearContext } from './context';
import { sale } from './selling';

const SLOTS: Slot[] = ['weapon', 'armor', 'treasure'];

/** The loadout chip (the one being worn) and its menu of all of them, Sell, and Unequip all. */
export function renderFoot(ctx: GearContext): void {
  const { ui, gear, selling, busy } = ctx;
  if (!gear) return;
  const active = gear.loadouts.find((l) => l.active);
  // An icon of stacked cards, with the worn loadout's number on its corner.
  ui.loadoutButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h11a2 2 0 0 1 2 2v11h-2V5H7Z" /><rect x="4" y="7" width="12" height="14" rx="2" /></svg>';
  if (active) ui.loadoutButton.append(el('span', 'hero-chip-badge', String(active.number)));
  ui.loadoutButton.setAttribute('aria-label', `Loadout: ${active?.name ?? 'none'}`);
  ui.loadoutButton.title = active ? `Loadout: ${active.name}` : 'Loadout';
  ui.loadoutButton.disabled = busy || gear.loadouts.length < 2;
  ui.unequipAll.disabled = busy || SLOTS.every((slot) => !gear.equipped[slot]);
  ui.unequipAll.hidden = !mine(ctx) || selling !== null;
  // Sell: to start picking, then (with some picked) to confirm. A bot from before selling on the site prices nothing.
  const { count, total } = sale(ctx);
  ui.sell.hidden = !mine(ctx) || wearOnly(ctx) || gear.copies.some((c) => c.sell === undefined);
  ui.sell.textContent = '';
  if (selling && count > 0) ui.sell.append(`Sell ${count} · ${points(total)}`, coin('coin', 'zeiucoins'));
  else ui.sell.append(selling ? 'Select items' : 'Sell');
  ui.sell.disabled = busy || (selling ? count === 0 : !gear.copies.some((c) => typeof c.sell === 'number'));
  ui.sell.classList.toggle('on', selling !== null);
  ui.sellCancel.hidden = selling === null;
  ui.sellCancel.disabled = busy;

  ui.loadoutMenu.textContent = '';
  for (const loadout of gear.loadouts) {
    const row = el('button', 'loadout-row');
    row.type = 'button';
    // Someone else's loadouts are there to look at, not to switch.
    row.disabled = busy || (!mine(ctx) && !loadout.active);
    row.classList.toggle('active', loadout.active);
    row.setAttribute('aria-current', String(loadout.active));
    const icons = el('span', 'loadout-icons');
    for (const slot of SLOTS) {
      const copy = copyById(ctx, loadout.equipped[slot]);
      const cell = el('span', `loadout-icon${copy ? '' : ' empty'}`);
      if (copy) cell.dataset.stars = String(copy.stars);
      cell.title = copy ? `${copy.name} (R${copy.level})` : `No ${SLOT_NAME[slot].toLowerCase()}`;
      cell.append(art(copy?.itemId ?? null, slot));
      icons.append(cell);
    }
    row.append(el('span', 'loadout-name', loadout.name), icons);
    if (loadout.active) row.setAttribute('aria-label', `${loadout.name} (wearing)`);
    row.addEventListener('click', () => {
      showMenu(ctx, false);
      if (!loadout.active && mine(ctx)) void switchTo(ctx, loadout.number);
    });
    ui.loadoutMenu.append(row);
  }
}

/** Opens or closes the loadout menu. */
export function showMenu(ctx: GearContext, open: boolean): void {
  ctx.ui.loadoutMenu.hidden = !open;
  ctx.ui.loadoutButton.setAttribute('aria-expanded', String(open));
}
