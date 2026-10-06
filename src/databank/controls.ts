import { dropdown } from '../shared/ui';
import { type Slot, starFilter } from '../shared/items';
import { setServer } from '../site/session';
import { narrow, type DatabankContext } from './context';
import { renderDetail } from './detail';
import { renderList } from './list';
import { loadOwned } from './owned';
import { render } from './render';

/** The search, the filters and the server picker. Returns what undoes it (the listeners outside the page's root). */
export function wireControls(ctx: DatabankContext): () => void {
  const { ui } = ctx;

  ui.search.addEventListener('input', () => {
    ctx.query = ui.search.value.trim().toLowerCase();
    renderList(ctx);
  });

  // The server picker in the site's dropdown, not the browser's (it follows the select, options and all).
  const serverPicker = dropdown(ui.server);

  ui.server.addEventListener('change', () => {
    setServer(ui.server.value);
    void loadOwned(ctx).then(() => render(ctx));
  });

  for (const tab of ui.tabs) {
    tab.addEventListener('click', () => {
      ctx.slotFilter = tab.dataset.filter as Slot | 'all';
      render(ctx);
    });
  }

  starFilter(ui.stars, (choice) => {
    ctx.starFilter = choice;
    render(ctx);
  });

  ui.ownedOnly.addEventListener('click', () => {
    ctx.onlyOwned = !ctx.onlyOwned;
    render(ctx);
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && ctx.sheetOpen) {
      ctx.sheetOpen = false;
      renderDetail(ctx);
    }
  };
  const onNarrow = (): void => renderDetail(ctx);
  document.addEventListener('keydown', onKey);
  narrow.addEventListener('change', onNarrow);

  return () => {
    document.removeEventListener('keydown', onKey);
    narrow.removeEventListener('change', onNarrow);
    serverPicker.destroy();
  };
}
