import { el, equippedIds, forgePlan, heroGear } from '../shared/items';
import type { HeroCopy } from '../shared/heroes';
import type { HeroMode } from './anvil/hero';
import { choosing, copyById, type ForgeContext, refineableIds } from './context';
import { heroCan } from './modes';
import { pick, pickMaterial } from './picking';

/** With nothing a hero mode can be done to: why. */
const NONE_FOR: Readonly<Record<HeroMode, string>> = {
  reroll: 'None of your hero gear has substats to reroll.',
  enhance: 'None of your hero gear has substats whose values can be rerolled.',
  effects: 'None of your hero gear has an additional effect to reroll: TechnoMagic pieces do.',
};

/**
 * The armory (../shared/items/armory.ts): every copy shown (by the filter, the stars and the search), greyed out when it can't go on
 * the anvil now, then blanks to fill out the last row. Under Refineable, only what can be refined. With a copy on the anvil,
 * only that item's copies, whatever the Filter and the search say: it, the spares it can use up, and the rest of it greyed out.
 */
export function renderGrid(ctx: ForgeContext): void {
  if (ctx.mode && ctx.mode !== 'refine') return renderHeroGrid(ctx, ctx.mode);
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
    slot: target ? 'all' : filter,
    stars: target ? 'all' : stars,
    query: target ? '' : query,
    matches: (c) => (target ? c.itemId === target.itemId : !refineable || refineable.has(c.id)),
    look: (copy) => {
      const isTarget = copy.id === picked;
      const isMaterial = copy.id === material;
      // Worn, or saved in any of their loadouts. The copy on the anvil stays in its place, darkened and named for what's being done to it.
      return {
        tag: isMaterial ? { text: 'Material' } : equipped.has(copy.id) ? { text: 'Equipped' } : null,
        classes: { selected: isTarget, material: isMaterial },
        disabled: usable !== null && !isTarget && !usable.has(copy.id),
        says: isTarget ? ['on the anvil'] : [],
        over: isTarget ? [el('span', 'item-selected', plan === 'refine' ? (heroGear(copy) ? 'Awakening' : 'Refining') : 'Selected')] : [],
      };
    },
    first: !target && refineable?.size === 0 && gear.copies.length > 0 ? 'Nothing can be refined yet: a refine uses up a spare copy of the same gear.' : null,
    none: "You don't own any gear yet. Pull some with Koma's gacha in Discord.",
    onPick: (copy) => (usable?.has(copy.id) ? pickMaterial(ctx, copy) : pick(ctx, copy)),
    ownSound: false,
  });
}

/**
 * The armory for a hero's gear's substats or effect: their hero gear (GET /api/heroes), only what the mode can be done to,
 * each tagged with the hero wearing it; the one on the anvil darkened, "Selected".
 */
function renderHeroGrid(ctx: ForgeContext, mode: HeroMode): void {
  const { heroes, ui, filter, stars, query, picked } = ctx;
  if (!heroes) return;
  const can = (copy: HeroCopy): boolean => heroCan(copy, mode);
  ui.grid.draw({
    copies: heroes.copies,
    slot: filter,
    stars,
    query,
    // (Every copy here is a hero's gear: the heroes page's.)
    hidden: (copy) => !can(copy as HeroCopy),
    look: (copy) => {
      const isTarget = copy.id === picked;
      const wearer = (copy as HeroCopy).hero;
      const on = wearer ? heroes.heroes.find((hero) => hero.id === wearer) : undefined;
      return {
        tag: on ? { text: `On ${on.name}` } : null,
        classes: { selected: isTarget },
        says: isTarget ? ['on the anvil'] : [],
        over: isTarget ? [el('span', 'item-selected', 'Selected')] : [],
      };
    },
    first: heroes.copies.some(can) ? null : NONE_FOR[mode],
    none: "You don't have any hero gear yet.",
    onPick: (copy) => pick(ctx, copy),
    ownSound: false,
  });
}
