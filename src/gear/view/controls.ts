import { dropdown } from '../../shared/ui';
import { hoverSound, itemPicked, type Slot, wireSaleDialog, wireSearch } from '../../shared/items';
import { change, loadGear, unequipEverything } from './api';
import { botHasClasses, classPickKey, fillClassPick, pickClass, renderClass, showClassPick, type HeroClass } from './classes';
import type { GearContext } from './context';
import { unpick } from './detail';
import { showMenu } from './foot';
import { renderGrid } from './grid';
import { render } from './render';
import { loadMembers, renderRoster } from './roster';
import { confirmSale, pickToSell, sell } from './selling';
import { renderStats } from './stats';

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

  ui.filter.onChange((choice) => {
    ctx.filter = choice.slot;
    ctx.stars = choice.stars;
    ctx.heroGear = choice.heroGear === true;
    render(ctx);
  });

  wireSearch(ui.search, (query) => {
    ctx.query = query;
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
  wireSaleDialog(ui.sellConfirm, () => void sell(ctx));
  ui.loadoutButton.addEventListener('click', (event) => {
    event.stopPropagation();
    showMenu(ctx, ui.loadoutMenu.hidden);
  });
  // The class ribbon opens its picker (and closes it again, as a click on the shade does); a class picked closes it.
  fillClassPick(ctx);
  ui.classButton.addEventListener('click', () => {
    showMenu(ctx, false);
    showClassPick(ctx, ui.classPick.hidden);
  });
  ui.classShade.addEventListener('click', () => showClassPick(ctx, false));
  ui.classPick.addEventListener('keydown', (event) => classPickKey(ctx, event));
  ui.classOptions.addEventListener('click', (event) => {
    const option = (event.target as HTMLElement).closest<HTMLElement>('[data-class]');
    if (!option) return;
    const heroClass = option.dataset.class as HeroClass;
    const saved = botHasClasses(ctx);
    const before = ctx.gear?.class ?? null;
    pickClass(heroClass);
    // Shown at once, on the ribbon and their roster portrait: the bot's word on their class (which the ribbon follows) is the old one until it answers.
    if (saved && ctx.gear) ctx.gear.class = heroClass;
    showClassPick(ctx, false);
    renderClass(ctx);
    renderRoster(ctx);
    renderStats(ctx);
    // Saved with the bot (when it keeps classes), which answers with their gear as it stands, its stats worked out for the new class: the ribbon, roster and Common tab follow.
    if (saved) {
      void change(ctx, 'class', '/api/gear/class', { class: heroClass }, 'Could not save your class. Try again.').then((gear) => {
        // Not saved: back to the class they had.
        if (!gear && ctx.gear?.class === heroClass) ctx.gear.class = before;
        renderClass(ctx);
        renderRoster(ctx);
      });
    }
  });
  // A click anywhere else closes the menu; Escape closes the class picker, else the menu, else the picked copy, else
  // stops picking copies to sell (the sale's confirmation closes itself).
  // (By the click's path: what was clicked in the menu may be gone by now, the menu drawn again for it.)
  const onClick = (event: MouseEvent): void => {
    if (!ui.loadoutMenu.hidden && !event.composedPath().includes(ui.loadoutMenu)) showMenu(ctx, false);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || ui.sellConfirm.open) return;
    if (!ui.classPick.hidden) {
      showClassPick(ctx, false);
      ui.classButton.focus();
    } else if (!ui.loadoutMenu.hidden) {
      showMenu(ctx, false);
      ui.loadoutButton.focus();
    } else if (ctx.picked) unpick(ctx);
    else if (ctx.selling) pickToSell(ctx, false);
  };
  // Come back to (another tab, another window): the roster as it is now.
  const onVisible = (): void => {
    if (document.visibilityState === 'visible' && !ctx.party) void loadMembers(ctx, true);
  };
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisible);
    ui.grid.destroy();
    if (ui.sellConfirm.open) ui.sellConfirm.close();
    serverPicker.destroy();
    ui.filter.destroy();
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
