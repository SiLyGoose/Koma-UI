import { el, forgePlan, shownName } from '../shared/items';
import { copyById, type ForgeContext, heroCopyById } from './context';
import { FORGE_MODES, type ForgeMode, heroCan } from './modes';
import { render } from './render';

/**
 * The forge's menu, before anything else: a column of buttons, one for each thing it does (./modes.ts), each its name and
 * what it does. A piece brought from its Upgrade (ctx.wanted) is named over them, and what can't be done to it is greyed out.
 */
export function renderMenu(ctx: ForgeContext): void {
  const { ui } = ctx;
  const piece = heroCopyById(ctx, ctx.wanted) ?? copyById(ctx, ctx.wanted);
  ui.menuFor.hidden = !piece;
  ui.menuFor.textContent = piece ? `For ${shownName(piece)}` : '';
  ui.modes.replaceChildren(
    ...FORGE_MODES.map((mode) => {
      const can = !piece || canDo(ctx, mode.id, ctx.wanted);
      const button = el('button', 'forge-mode action secondary');
      button.type = 'button';
      button.disabled = !can;
      button.append(el('span', 'forge-mode-name', mode.name), el('span', 'forge-mode-about', can ? mode.about : 'Not for this piece.'));
      button.addEventListener('click', () => choose(ctx, mode.id));
      return button;
    }),
  );
}

/** Whether the forge can do `mode` to the copy `id`: refine it (their gear's, below its top), or the rest to a hero's gear. */
function canDo(ctx: ForgeContext, mode: ForgeMode, id: string | null): boolean {
  if (mode === 'refine') {
    const copy = copyById(ctx, id);
    return !!copy && forgePlan(copy).kind === 'refine';
  }
  const copy = heroCopyById(ctx, id);
  return !!copy && heroCan(copy, mode);
}

/** Starts `mode`: the anvil and armory for it, the piece brought from its Upgrade on the anvil when the mode can take it. */
export function choose(ctx: ForgeContext, mode: ForgeMode): void {
  ctx.mode = mode;
  ctx.picked = canDo(ctx, mode, ctx.wanted) ? ctx.wanted : null;
  ctx.material = null;
  ctx.option = null;
  ctx.keep = null;
  ctx.done = null;
  render(ctx);
  scrollTo({ top: 0 });
}

/** Back to the menu, for the piece that was on the anvil (if any): the other modes for it a click away. */
export function toMenu(ctx: ForgeContext): void {
  ctx.wanted = ctx.picked ?? ctx.wanted;
  ctx.mode = null;
  ctx.picked = null;
  ctx.material = null;
  ctx.option = null;
  ctx.keep = null;
  ctx.done = null;
  render(ctx);
}
