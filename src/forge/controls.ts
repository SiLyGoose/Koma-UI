import { dropdown } from '../shared/dropdown';
import type { Slot } from '../shared/items/items';
import { starFilter } from '../shared/items/star-filter';
import { setServer } from '../site/session';
import { loadGear, strikeAnvil } from './api';
import type { ForgeContext } from './context';
import { columns, renderGrid } from './grid';
import { clear } from './picking';
import { render } from './render';
import { closeResult, resultOpen } from './result';

/** Hooks up everything that can be pressed. Returns what undoes it (the listeners outside the forge's root). */
export function wireControls(ctx: ForgeContext): () => void {
  const { ui } = ctx;

  // The server picker in the site's dropdown, not the browser's (it follows the select, options and all).
  const serverPicker = dropdown(ui.server);

  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    clear(ctx);
    void loadGear(ctx);
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

  ui.go.addEventListener('click', () => void strikeAnvil(ctx));

  // A slot on the anvil empties when clicked: the target takes its material with it.
  ui.target.addEventListener('click', () => {
    if (!ctx.picked || ctx.busy) return;
    clear(ctx);
    render(ctx);
  });
  ui.material.addEventListener('click', () => {
    if (!ctx.material || ctx.busy) return;
    ctx.material = null;
    render(ctx);
  });

  // The result closes on a click anywhere.
  ui.result.addEventListener('click', () => closeResult(ctx));

  // Escape, Enter or Space close the result; else Escape takes the copy off the anvil.
  const onKey = (event: KeyboardEvent): void => {
    if (resultOpen(ctx)) {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        closeResult(ctx);
      }
      return;
    }
    if (event.key !== 'Escape' || !ctx.picked) return;
    clear(ctx);
    render(ctx);
  };
  // A resize that changes how many cards fit across refills the blanks.
  const onResize = (): void => {
    if (ctx.gridColumns && columns(ctx) !== ctx.gridColumns) renderGrid(ctx);
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  return () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    serverPicker.destroy();
  };
}
