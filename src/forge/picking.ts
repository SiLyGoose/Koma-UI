import type { GearCopy } from '../shared/items/gear';
import type { ForgeContext } from './context';
import { playAnimation } from './play-animation';
import { render } from './render';

/** Puts `copy` on the anvil (its slot takes it with a pop), or takes it off again. */
export function pick(ctx: ForgeContext, copy: GearCopy): void {
  ctx.done = null;
  ctx.material = null;
  ctx.picked = ctx.picked === copy.id ? null : copy.id;
  render(ctx);
  if (ctx.picked) playAnimation(ctx.ui.target, 'placed', 'placed');
  // One over the other on narrow screens: back up to the anvil to see it.
  if (ctx.picked && matchMedia('(max-width: 899px)').matches) ctx.ui.anvil.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Puts `copy` in the Materials slot (which takes it with a pop), or takes it out again. */
export function pickMaterial(ctx: ForgeContext, copy: GearCopy): void {
  ctx.done = null;
  ctx.material = ctx.material === copy.id ? null : copy.id;
  render(ctx);
  if (ctx.material) playAnimation(ctx.ui.material, 'placed', 'placed');
}

/** Empties the anvil. */
export function clear(ctx: ForgeContext): void {
  ctx.picked = null;
  ctx.material = null;
  ctx.done = null;
}
