import { art, drawSell, el, type GearLockedLoadout, type Slot, SLOT_NAME } from '../../shared/items';
import { working } from '../../shared/ui';
import { coin } from '../../shared/util/coin';
import { LOADOUT_NAME_MAX, renameLoadout, switchTo, unlockLoadout } from './api';
import { canRename, copyById, mine, wearOnly, type GearContext } from './context';

const SLOTS: Slot[] = ['weapon', 'armor', 'treasure'];

const PENCIL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" /></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" /></svg>';
const CROSS =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" /></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9V7A5 5 0 0 0 7 7v2H5v12h14V9h-2ZM9 7a3 3 0 0 1 6 0v2H9V7Z" /></svg>';

/** The loadout chip (the one being worn) and its menu of all of them (./renderMenu), Sell, and Unequip all. */
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
  // (With one loadout, the menu is still there for unlocking more.)
  ui.loadoutButton.disabled = gear.loadouts.length < 2 && !(canRename(ctx) && (gear.lockedLoadouts ?? []).length > 0);
  working(ui.loadoutButton, busy, 'loadout');
  ui.unequipAll.disabled = SLOTS.every((slot) => !gear.equipped[slot]);
  working(ui.unequipAll, busy, 'unequip-all');
  ui.unequipAll.hidden = !mine(ctx) || selling !== null;
  // Sell: to start picking, then (with some picked) to confirm.
  drawSell(ui.sell, ui.sellCancel, gear.copies, selling, busy, mine(ctx) && !wearOnly(ctx));
  renderMenu(ctx);
}

/**
 * The loadout menu: a row for each, to switch to it, and (their own, on the gear page) a pencil beside
 * it to name it. The one being named (ctx.renaming) is a box to type in instead, kept as it was typed
 * in (and the keyboard in it) however often the menu is drawn again.
 */
export function renderMenu(ctx: GearContext): void {
  const { ui, gear, busy } = ctx;
  if (!gear) return;
  if (ctx.renaming && !canRename(ctx)) ctx.renaming = null;
  const typing = ui.loadoutMenu.contains(document.activeElement);
  ui.loadoutMenu.textContent = '';
  for (const loadout of gear.loadouts) {
    const row = el('div', 'loadout-row');
    row.classList.toggle('active', loadout.active);
    const renaming = ctx.renaming?.number === loadout.number ? ctx.renaming : null;
    if (renaming) {
      row.classList.add('editing');
      const saving = busy?.action === `rename:${loadout.number}`;
      const form = el('form', 'loadout-edit');
      const input = el('input', 'loadout-input');
      input.type = 'text';
      input.value = renaming.value;
      input.maxLength = LOADOUT_NAME_MAX;
      // Nothing typed: its own name again.
      input.placeholder = `Loadout ${loadout.number}`;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.readOnly = saving;
      input.setAttribute('aria-label', `Name of ${loadout.name}`);
      input.setAttribute('aria-invalid', String(renaming.error !== null));
      input.addEventListener('input', () => {
        renaming.value = input.value;
      });
      // Escape puts the name back as it was (and leaves the menu open: ./controls.ts closes it otherwise).
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        ctx.renaming = null;
        renderMenu(ctx);
        ui.loadoutMenu.querySelector<HTMLElement>(`[data-rename="${loadout.number}"]`)?.focus();
      });
      const save = el('button', 'loadout-tool');
      save.type = 'submit';
      save.innerHTML = CHECK;
      save.setAttribute('aria-label', 'Save name');
      save.title = 'Save';
      if (saving) save.setAttribute('aria-disabled', 'true');
      form.append(input, save);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        void renameLoadout(ctx);
      });
      row.append(form);
      if (renaming.error) {
        const error = el('p', 'loadout-error', renaming.error);
        error.setAttribute('role', 'alert');
        row.append(error);
      }
      ui.loadoutMenu.append(row);
      continue;
    }
    const pick = el('button', 'loadout-switch');
    pick.type = 'button';
    // Someone else's loadouts are there to look at, not to switch.
    pick.disabled = !mine(ctx) && !loadout.active;
    pick.setAttribute('aria-current', String(loadout.active));
    const icons = el('span', 'loadout-icons');
    for (const slot of SLOTS) {
      const copy = copyById(ctx, loadout.equipped[slot]);
      const cell = el('span', `loadout-icon${copy ? '' : ' empty'}`);
      if (copy) cell.dataset.stars = String(copy.stars);
      cell.title = copy ? `${copy.name} (★${copy.level})` : `No ${SLOT_NAME[slot].toLowerCase()}`;
      cell.append(art(copy?.itemId ?? null, slot));
      icons.append(cell);
    }
    pick.append(el('span', 'loadout-name', loadout.name), icons);
    if (loadout.active) pick.setAttribute('aria-label', `${loadout.name} (wearing)`);
    pick.addEventListener('click', () => {
      showMenu(ctx, false);
      if (!loadout.active && mine(ctx)) void switchTo(ctx, loadout.number);
    });
    row.append(pick);
    if (canRename(ctx)) {
      const rename = el('button', 'loadout-tool');
      rename.type = 'button';
      rename.innerHTML = PENCIL;
      rename.dataset.rename = String(loadout.number);
      rename.setAttribute('aria-label', `Rename ${loadout.name}`);
      rename.title = 'Rename';
      rename.addEventListener('click', () => {
        if (ctx.busy) return;
        ctx.renaming = { number: loadout.number, value: loadout.name, error: null };
        renderMenu(ctx);
        ui.loadoutMenu.querySelector<HTMLInputElement>('.loadout-input')?.select();
      });
      row.append(rename);
    }
    ui.loadoutMenu.append(row);
  }
  // Their own, on the gear page: the loadouts still locked, the next one to unlock for its price.
  if (canRename(ctx)) for (const [i, locked] of (gear.lockedLoadouts ?? []).entries()) ui.loadoutMenu.append(lockedRow(ctx, locked, i === 0));
  // Drawn again mid-name (a save on its way, a name the bot wouldn't have): the keyboard stays in the box, at its end.
  const input = typing ? ui.loadoutMenu.querySelector<HTMLInputElement>('.loadout-input') : null;
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

/** A price in zeiucoins: the number, then the coin. */
function price(amount: number): HTMLElement {
  const tag = el('span', 'loadout-price', amount.toLocaleString());
  tag.append(coin('loadout-coin'));
  return tag;
}

/**
 * A loadout not unlocked yet: its lock, its name and its price. Only the `next` one can be unlocked, and only
 * with the zeiucoins for it; pressing it asks once more (ctx.unlocking), with a tick to pay and a cross not to.
 */
function lockedRow(ctx: GearContext, locked: GearLockedLoadout, next: boolean): HTMLElement {
  const { ui, gear, busy } = ctx;
  const { number } = locked;
  const row = el('div', 'loadout-row locked');
  if (next && ctx.unlocking === number) {
    row.classList.add('confirming');
    const ask = el('span', 'loadout-ask', 'Unlock for');
    ask.append(price(locked.price));
    const yes = el('button', 'loadout-tool');
    yes.type = 'button';
    yes.innerHTML = CHECK;
    yes.dataset.unlockYes = String(number);
    yes.setAttribute('aria-label', `Unlock Loadout ${number} for ${locked.price.toLocaleString()} zeiucoins`);
    yes.title = 'Unlock';
    if (busy?.action === `unlock:${number}`) yes.setAttribute('aria-disabled', 'true');
    yes.addEventListener('click', () => {
      if (ctx.busy) return;
      void unlockLoadout(ctx, number).then(() => {
        ctx.unlocking = null;
        renderMenu(ctx);
      });
    });
    const no = el('button', 'loadout-tool');
    no.type = 'button';
    no.innerHTML = CROSS;
    no.setAttribute('aria-label', 'Keep it locked');
    no.title = 'Cancel';
    no.addEventListener('click', () => {
      if (ctx.busy) return;
      ctx.unlocking = null;
      renderMenu(ctx);
      ui.loadoutMenu.querySelector<HTMLElement>(`[data-unlock="${number}"]`)?.focus();
    });
    row.append(ask, yes, no);
    return row;
  }
  const short = gear?.balance != null && gear.balance < locked.price;
  const pick = el('button', 'loadout-switch loadout-unlock');
  pick.type = 'button';
  pick.dataset.unlock = String(number);
  pick.disabled = !next || short;
  pick.title = !next ? `Unlock Loadout ${number - 1} first` : short ? `You need ${locked.price.toLocaleString()} zeiucoins` : `Unlock for ${locked.price.toLocaleString()} zeiucoins`;
  const lock = el('span', 'loadout-lock');
  lock.innerHTML = LOCK;
  pick.append(lock, el('span', 'loadout-name', `Loadout ${number}`), price(locked.price));
  pick.addEventListener('click', () => {
    if (ctx.busy) return;
    ctx.unlocking = number;
    renderMenu(ctx);
    ui.loadoutMenu.querySelector<HTMLElement>(`[data-unlock-yes="${number}"]`)?.focus();
  });
  row.append(pick);
  return row;
}

/** Opens or closes the loadout menu. Closing it drops a name being typed, and an unlock being asked about. */
export function showMenu(ctx: GearContext, open: boolean): void {
  ctx.ui.loadoutMenu.hidden = !open;
  ctx.ui.loadoutButton.setAttribute('aria-expanded', String(open));
  if (!open && (ctx.renaming || ctx.unlocking !== null)) {
    ctx.renaming = null;
    ctx.unlocking = null;
    renderMenu(ctx);
  }
}
