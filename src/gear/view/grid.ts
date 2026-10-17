import { equippedIds, itemPicked, tierOf } from '../../shared/items';
import { mine, type GearContext } from './context';
import { renderDetail } from './detail';
import { renderFoot } from './foot';

/** The armory (../../shared/items/armory.ts): every copy shown (by the filter, the stars and the search), then blanks to fill out the last row. */
export function renderGrid(ctx: GearContext): void {
  const { gear, ui, selling, filter, stars, query, viewing } = ctx;
  if (!gear) return;
  const equipped = equippedIds(gear);
  ui.grid.draw({
    copies: gear.copies,
    slot: filter,
    stars,
    query,
    sort: ctx.sort,
    // (Gear only heroes wear, only with Hero gear on, or its own tier picked.)
    hidden: (c) => !ctx.heroGear && typeof tierOf(c) !== 'number' && stars !== tierOf(c),
    // Worn, or saved in any of their loadouts.
    look: (copy) => ({ tag: equipped.has(copy.id) ? { text: 'Equipped' } : copy.hero ? { text: `On ${copy.hero}` } : null }),
    picked: ctx.picked,
    selling,
    none: viewing && !mine(ctx) ? `${viewing.name} doesn't own any gear yet.` : "You don't own any gear yet. Pull some with Koma's gacha in Discord.",
    onPick: (copy) => pickCard(ctx, copy.id),
  });
}

/** A card clicked: shows what it does (again: hides it), or, picking what to sell, picks it to sell. */
function pickCard(ctx: GearContext, id: string): void {
  // Its sound, and the details' when they show it (opened, or switched to it).
  const before = ctx.picked;
  const sound = (): void => itemPicked(before, ctx.picked);
  // Picking what to sell: the one picked last is shown over the character (unpicking it shows the one before).
  const { selling } = ctx;
  if (selling) {
    if (selling.delete(id)) {
      if (ctx.picked === id) ctx.picked = [...selling].at(-1) ?? null;
    } else {
      selling.add(id);
      ctx.picked = id;
    }
    renderGrid(ctx);
    renderDetail(ctx);
    renderFoot(ctx);
    sound();
    return;
  }
  ctx.picked = ctx.picked === id ? null : id;
  renderGrid(ctx);
  renderDetail(ctx);
  sound();
}
