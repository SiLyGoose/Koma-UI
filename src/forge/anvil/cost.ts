import { coin, points } from '../../shared/util';
import { el, type Plan } from '../../shared/items';
import { balance, type ForgeContext } from '../context';

/** The price in the corner, in zeiucoins. */
export function renderCost(ctx: ForgeContext, plan: Plan | null): void {
  const { ui } = ctx;
  ui.cost.textContent = '';
  const cost = plan?.kind === 'refine' ? (plan.refine.cost ?? 0) : 0;
  ui.cost.append(coin('anvil-cost-icon', 'zeiucoins'), el('span', 'anvil-cost-amount', points(cost)));
  const have = balance(ctx);
  const short = plan?.kind === 'refine' && (plan.refine.blocked === 'too_poor' || (have !== null && have < cost));
  ui.cost.title = cost && have !== null ? `${points(cost)} zeiucoins (you have ${points(have)})` : '';
  ui.cost.classList.toggle('bad', short);
}
