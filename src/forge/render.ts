import { currentMe } from '../site/session';
import { renderAnvil } from './anvil';
import type { ForgeContext } from './context';
import { renderGrid } from './grid';
import { renderMenu } from './menu';
import { FORGE_MODES } from './modes';

/** Draws the whole forge: its menu, or (a mode picked) the armory and the anvil. */
export function render(ctx: ForgeContext): void {
  const me = currentMe();
  if (!me || !ctx.gear) return;
  const { ui } = ctx;
  ui.menu.hidden = ctx.mode !== null;
  ui.forge.hidden = ctx.mode === null;
  if (ctx.mode === null) return renderMenu(ctx);
  // (The mode's own parts: a refine's Materials and odds, ../forge.css's .refine-only.)
  ui.forge.dataset.mode = ctx.mode;
  ui.modeName.textContent = FORGE_MODES.find((mode) => mode.id === ctx.mode)?.name ?? '';
  const refining = ctx.mode === 'refine';
  ui.armoryTitle.textContent = refining ? `${me.user.name}'s Armory` : `${me.user.name}'s Hero Gear`;
  ui.filter.show({ slot: ctx.filter, stars: ctx.stars, owned: null, refineable: refining ? ctx.refineable : null, cls: null, heroGear: null, sort: null });
  renderGrid(ctx);
  renderAnvil(ctx);
}
