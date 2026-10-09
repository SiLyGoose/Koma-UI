import { currentMe } from '../site/session';
import { renderAnvil } from './anvil';
import type { ForgeContext } from './context';
import { renderGrid } from './grid';

/** Draws the whole forge: the armory and the anvil. */
export function render(ctx: ForgeContext): void {
  const me = currentMe();
  if (!me || !ctx.gear) return;
  const { ui } = ctx;
  ui.forge.hidden = false;
  ui.armoryTitle.textContent = `${me.user.name}'s Armory`;
  ui.filter.show({ slot: ctx.filter, stars: ctx.stars, owned: null });
  renderGrid(ctx);
  renderAnvil(ctx);
}
