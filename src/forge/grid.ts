import { el, equippedIds, forgePlan } from '../shared/items';
import { choosing, copyById, type ForgeContext, refineableIds } from './context';
import { pick, pickMaterial } from './picking';

/**
 * The armory (../shared/items/armory.ts): every copy shown (by the filter, the stars and the search), greyed out when it can't go on
 * the anvil now, then blanks to fill out the last row. Under Refineable, only what can be refined, and
 * with one of those on the anvil, it and the spares it can use up (which may not be refineable themselves).
 */
export function renderGrid(ctx: ForgeContext): void {
  const { gear, ui, filter, stars, query, picked, material } = ctx;
  if (!gear) return;
  // Picking material: everything that can't be used up is greyed out and can't be picked.
  const usable = choosing(ctx);
  const refineable = ctx.refineable ? refineableIds(ctx) : null;
  const target = copyById(ctx, picked);
  const plan = target ? forgePlan(target).kind : null;
  const equipped = equippedIds(gear);
  ui.grid.draw({
    copies: gear.copies,
    slot: filter,
    stars,
    query,
    matches: (c) => !refineable || refineable.has(c.id) || c.id === picked || (usable?.has(c.id) ?? false),
    look: (copy) => {
      const isTarget = copy.id === picked;
      const isMaterial = copy.id === material;
      // Worn, or saved in any of their loadouts. The copy on the anvil stays in its place, darkened and named for what's being done to it.
      return {
        tag: isMaterial ? { text: 'Material' } : equipped.has(copy.id) ? { text: 'Equipped' } : null,
        classes: { selected: isTarget, material: isMaterial },
        disabled: usable !== null && !isTarget && !usable.has(copy.id),
        says: isTarget ? ['on the anvil'] : [],
        over: isTarget ? [el('span', 'item-selected', plan === 'refine' ? 'Refining' : 'Selected')] : [],
      };
    },
    first: refineable?.size === 0 && gear.copies.length > 0 ? 'Nothing can be refined yet: a refine uses up a spare copy of the same gear.' : null,
    none: "You don't own any gear yet. Pull some with Koma's gacha in Discord.",
    onPick: (copy) => (usable?.has(copy.id) ? pickMaterial(ctx, copy) : pick(ctx, copy)),
    ownSound: false,
  });
}
