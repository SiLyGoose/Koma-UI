import { dropdown } from '../../shared/ui';
import { hoverSound, itemPicked, type Slot, starFilter } from '../../shared/items';
import { loadGear, unequipEverything } from './api';
import type { GearContext } from './context';
import { unpick } from './detail';
import { showMenu } from './foot';
import { columns, renderGrid } from './grid';
import { render } from './render';
import { loadMembers } from './roster';
import { confirmSale, pickToSell, sell } from './selling';

/** Hooks up everything that can be pressed. Returns what undoes it (the listeners outside the view's root). */
export function wireControls(ctx: GearContext): () => void {
  const { ui } = ctx;

  // The server picker in the site's dropdown, not the browser's (it follows the select, options and all).
  const serverPicker = dropdown(ui.server);

  ui.server.addEventListener('change', () => {
    ctx.host.setServer(ui.server.value);
    ctx.picked = null;
    ctx.selling = null;
    ctx.viewing = null;
    ctx.members = [];
    void loadGear(ctx);
    void loadMembers(ctx);
  });

  for (const tab of ui.tabs) {
    tab.addEventListener('click', () => {
      ctx.filter = tab.dataset.filter as Slot | 'all';
      render(ctx);
    });
  }

  starFilter(ui.stars, (choice) => {
    ctx.stars = choice;
    renderGrid(ctx);
  });

  ui.search.addEventListener('input', () => {
    ctx.query = ui.search.value.trim().toLowerCase();
    renderGrid(ctx);
  });
  // Escape in the search empties it (every browser, not just those that do it themselves), and does nothing else.
  ui.search.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || ui.search.value === '') return;
    event.preventDefault();
    event.stopPropagation();
    ui.search.value = '';
    ctx.query = '';
    renderGrid(ctx);
  });

  for (const tab of ui.views) {
    tab.addEventListener('click', () => {
      ctx.view = tab.dataset.view as GearContext['view'];
      if (ctx.view === 'common') {
        ctx.picked = null;
        ctx.selling = null;
      }
      render(ctx);
    });
  }

  for (const button of ui.slots) wireSlot(ctx, button);

  ui.unequipAll.addEventListener('click', () => void unequipEverything(ctx));
  ui.sell.addEventListener('click', () => (ctx.selling ? confirmSale(ctx) : pickToSell(ctx, true)));
  ui.sellCancel.addEventListener('click', () => pickToSell(ctx, false));
  ui.sellConfirm.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-sell]');
    // A click on the backdrop (the dialog itself, outside its box) cancels too.
    if (!button && event.target !== ui.sellConfirm) return;
    ui.sellConfirm.close();
    if (button?.dataset.sell === 'confirm') void sell(ctx);
  });
  ui.loadoutButton.addEventListener('click', (event) => {
    event.stopPropagation();
    showMenu(ctx, ui.loadoutMenu.hidden);
  });
  // A click anywhere else closes the menu; Escape closes the menu, else the picked copy, else stops picking copies to
  // sell (the sale's confirmation closes itself).
  const onClick = (event: MouseEvent): void => {
    if (!ui.loadoutMenu.hidden && !ui.loadoutMenu.contains(event.target as Node)) showMenu(ctx, false);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || ui.sellConfirm.open) return;
    if (!ui.loadoutMenu.hidden) {
      showMenu(ctx, false);
      ui.loadoutButton.focus();
    } else if (ctx.picked) unpick(ctx);
    else if (ctx.selling) pickToSell(ctx, false);
  };
  // A resize that changes how many cards fit across refills the blanks.
  const onResize = (): void => {
    if (ctx.gridColumns && columns(ctx) !== ctx.gridColumns) renderGrid(ctx);
  };
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    if (ui.sellConfirm.open) ui.sellConfirm.close();
    serverPicker.destroy();
  };
}

/** A slot shows what fits in it, with what's in it picked (again: back to everything). */
function wireSlot(ctx: GearContext, button: HTMLButtonElement): void {
  // A slot with something in it is an item too: its sounds, as the armory's cards have.
  hoverSound(button, `slot:${button.dataset.slot}`, () => !button.classList.contains('empty'));
  button.addEventListener('click', () => {
    if (button.classList.contains('empty')) return;
    const before = ctx.picked;
    // Once the slot's own click (below) has picked what's in it.
    setTimeout(() => itemPicked(before, ctx.picked), 0);
  });
  button.addEventListener('click', () => {
    const slot = button.dataset.slot as Slot;
    // While picking copies to sell, a slot only shows what fits in it.
    if (ctx.selling) {
      ctx.filter = ctx.filter === slot ? 'all' : slot;
      return render(ctx);
    }
    // From the Common tab, a slot always opens the gear on it.
    const fromStats = ctx.view === 'common';
    ctx.view = 'gear';
    if (ctx.filter === slot && !fromStats) {
      ctx.filter = 'all';
      ctx.picked = null;
    } else {
      ctx.filter = slot;
      ctx.picked = ctx.gear?.equipped[slot] ?? null;
    }
    render(ctx);
  });
}
