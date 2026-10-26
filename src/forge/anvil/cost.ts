import { coin, points } from '../../shared/util';
import { crystalIcon, crystalName, el, type Plan, rich } from '../../shared/items';
import { balance, type ForgeContext } from '../context';
import { GEM_EMOJI } from './gem';

/** The price in the corner, in zeiucoins: a refine's. */
export function renderCost(ctx: ForgeContext, plan: Plan | null): void {
  const cost = plan?.kind === 'refine' ? (plan.refine.cost ?? 0) : 0;
  const have = balance(ctx);
  showPrice(ctx, [{ cost, have, unit: 'zeiucoins', short: plan?.kind === 'refine' && (plan.refine.blocked === 'too_poor' || (have !== null && have < cost)) }]);
}

/** What a price is paid in: zeiucoins, komaGems, or a TechnoMagic set's Boss Crystals (`crystals:<set>`). */
export type PriceUnit = 'zeiucoins' | 'komaGems' | `crystals:${string}`;

/** A part of the price in the corner: `cost` in zeiucoins, komaGems or Boss Crystals (`have` of them), `short` when it's more than they have. */
export interface PriceShown {
  cost: number;
  have: number | null;
  unit: PriceUnit;
  short: boolean;
}

/** The price in the corner, each of its parts (a TechnoMagic effect's: komaGems and Boss Crystals) in red when they're short of it. */
export function showPrice(ctx: ForgeContext, parts: readonly PriceShown[]): void {
  const { ui } = ctx;
  ui.cost.textContent = '';
  const titles: string[] = [];
  for (const { cost, have, unit, short } of parts) {
    const set = unit.startsWith('crystals:') ? unit.slice('crystals:'.length) : null;
    const icon = unit === 'zeiucoins' ? coin('anvil-cost-icon', 'zeiucoins') : set ? crystalIcon(set, 'anvil-cost-icon') : el('span', 'anvil-cost-icon');
    if (unit === 'komaGems') icon.append(rich(GEM_EMOJI));
    const part = el('span', 'anvil-cost-part');
    part.classList.toggle('bad', short);
    part.append(icon, el('span', 'anvil-cost-amount', points(cost)));
    ui.cost.append(part);
    if (cost && have !== null) titles.push(`${points(cost)} ${set ? crystalName(set) : unit} (you have ${points(have)})`);
  }
  ui.cost.title = titles.join(' and ');
  ui.cost.classList.toggle('split', parts.length > 1);
}
