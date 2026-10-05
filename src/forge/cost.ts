import { coin } from '../shared/coin';
import { points } from '../shared/format';
import type { Plan } from '../shared/items/gear';
import { el, rich } from '../shared/items/items';
import { balance, type ForgeContext } from './context';
import { GEM_EMOJI } from './gem';

/** The price in the corner: zeiucoins for a refine, komaGems for a forge. */
export function renderCost(ctx: ForgeContext, plan: Plan | null): void {
  const { ui, gear } = ctx;
  ui.cost.textContent = '';
  let short = false;
  if (plan?.kind === 'forge') {
    const cost = plan.forge?.cost ?? null;
    ui.cost.append(el('span', 'anvil-cost-icon'));
    (ui.cost.lastChild as HTMLElement).append(rich(GEM_EMOJI));
    ui.cost.append(el('span', 'anvil-cost-amount', cost === null ? '?' : points(cost)));
    short = plan.forge?.blocked === 'too_poor';
    ui.cost.title = cost === null ? '' : `${points(cost)} komaGems${gear?.gems != null ? ` (you have ${points(gear.gems)})` : ''}`;
  } else {
    const cost = plan?.kind === 'refine' ? (plan.refine.cost ?? 0) : 0;
    ui.cost.append(coin('anvil-cost-icon', 'zeiucoins'), el('span', 'anvil-cost-amount', points(cost)));
    const have = balance(ctx);
    short = plan?.kind === 'refine' && (plan.refine.blocked === 'too_poor' || (have !== null && have < cost));
    ui.cost.title = cost && have !== null ? `${points(cost)} zeiucoins (you have ${points(have)})` : '';
  }
  ui.cost.classList.toggle('bad', short);
}
