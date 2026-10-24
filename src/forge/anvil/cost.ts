import { coin, points } from '../../shared/util';
import { crystalIcon, crystalName, el, type Plan, rich } from '../../shared/items';
import { balance, type ForgeContext } from '../context';
import { GEM_EMOJI } from './gem';

/** The price in the corner, in zeiucoins: a refine's. */
export function renderCost(ctx: ForgeContext, plan: Plan | null): void {
  const cost = plan?.kind === 'refine' ? (plan.refine.cost ?? 0) : 0;
  const have = balance(ctx);
  showPrice(ctx, cost, have, 'zeiucoins', plan?.kind === 'refine' && (plan.refine.blocked === 'too_poor' || (have !== null && have < cost)));
}

/** What a price is paid in: zeiucoins, komaGems, or a TechnoMagic set's Boss Crystals (`crystals:<set>`). */
export type PriceUnit = 'zeiucoins' | 'komaGems' | `crystals:${string}`;

/** The price in the corner: `cost` in zeiucoins, komaGems or Boss Crystals (`have` of them), in red when it's more than they have (`short`). */
export function showPrice(ctx: ForgeContext, cost: number, have: number | null, unit: PriceUnit, short = have !== null && have < cost): void {
  const { ui } = ctx;
  ui.cost.textContent = '';
  const set = unit.startsWith('crystals:') ? unit.slice('crystals:'.length) : null;
  const icon = unit === 'zeiucoins' ? coin('anvil-cost-icon', 'zeiucoins') : set ? crystalIcon(set, 'anvil-cost-icon') : el('span', 'anvil-cost-icon');
  if (unit === 'komaGems') icon.append(rich(GEM_EMOJI));
  ui.cost.append(icon, el('span', 'anvil-cost-amount', points(cost)));
  const named = set ? crystalName(set) : unit;
  ui.cost.title = cost && have !== null ? `${points(cost)} ${named} (you have ${points(have)})` : '';
  ui.cost.classList.toggle('bad', short);
}
