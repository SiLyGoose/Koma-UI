import { wireSearch } from '../shared/items';
import { dropdown } from '../shared/ui';
import { setServer } from '../site/session';
import { loadGear, loadHeroes, strikeAnvil, strikeHero } from './api';
import type { ForgeContext } from './context';
import { renderGrid } from './grid';
import { toMenu } from './menu';
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
    ctx.wanted = null;
    void loadGear(ctx);
    void loadHeroes(ctx);
  });

  ui.filter.onChange((choice) => {
    ctx.filter = choice.slot;
    ctx.stars = choice.stars;
    ctx.refineable = choice.refineable === true;
    render(ctx);
  });

  wireSearch(ui.search, (query) => {
    ctx.query = query;
    renderGrid(ctx);
  });

  // The anvil's button: the mode's (a refine, or a hero's gear's reroll or enhance).
  ui.go.addEventListener('click', () => void (ctx.mode === 'refine' ? strikeAnvil(ctx) : ctx.mode ? strikeHero(ctx, ctx.mode) : undefined));

  // Back to the menu (not while the anvil is busy).
  ui.back.addEventListener('click', () => {
    if (!ctx.busy) toMenu(ctx);
  });

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
  document.addEventListener('keydown', onKey);

  return () => {
    document.removeEventListener('keydown', onKey);
    ui.grid.destroy();
    serverPicker.destroy();
    ui.filter.destroy();
  };
}
