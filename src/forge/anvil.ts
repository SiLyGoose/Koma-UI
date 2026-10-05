import { forgePlan, type GearCopy, type Plan } from '../shared/items/gear';
import { el, rich } from '../shared/items/items';
import { card } from './card';
import { compare, withoutDormant, type EffectRow } from './compare';
import { balance, choosing, copyById, type ForgeContext } from './context';
import { renderCost } from './cost';
import { fillEffects } from './effects';
import { GEM_EMOJI } from './gem';
import { hintFor } from './hint';

/** Every refine and forge works for now: no chance of failing, so nothing to make up for it. */
const SUCCESS_RATE = 100;
const FAILURE_BONUS = 0;

/** The anvil: the hint, the target and its material, the odds, what changes, the price and the button. */
export function renderAnvil(ctx: ForgeContext): void {
  const { ui } = ctx;
  const copy = copyById(ctx, ctx.picked);
  const plan = copy ? forgePlan(copy) : null;
  ui.anvil.dataset.stars = copy ? String(copy.stars) : '';

  const hint = hintFor(ctx, copy, plan);
  ui.hint.textContent = '';
  ui.hint.append(rich(hint.text));
  ui.hint.classList.toggle('good', hint.tone === 'good');
  ui.hint.classList.toggle('bad', hint.tone === 'bad');

  ui.target.replaceChildren(copy ? card(copy) : el('span', 'anvil-empty'));
  ui.target.classList.toggle('filled', !!copy);
  ui.target.title = copy ? 'Take it off the anvil' : '';
  // What it uses up: the spare picked for a refine (the slot waiting for one until then), gems for a forge.
  const spare = plan?.kind === 'refine' ? copyById(ctx, ctx.material) : undefined;
  if (spare) ui.material.replaceChildren(card(spare));
  else if (plan?.kind === 'forge') {
    const gem = el('span', 'anvil-gem');
    gem.append(rich(GEM_EMOJI));
    ui.material.replaceChildren(gem);
  } else ui.material.replaceChildren(el('span', 'anvil-empty'));
  ui.material.classList.toggle('filled', !!spare || plan?.kind === 'forge');
  ui.material.classList.toggle('waiting', !spare && !!choosing(ctx)?.size);
  ui.material.title = spare ? 'Take it off the anvil' : '';

  ui.rate.textContent = `${SUCCESS_RATE}%`;
  ui.bonus.textContent = `+${FAILURE_BONUS}%`;
  renderEffects(ctx, copy, plan);
  renderCost(ctx, plan);

  ui.go.textContent = plan?.kind === 'forge' ? 'Forge Masterwork' : 'Refine Gear';
  const have = balance(ctx);
  ui.go.disabled =
    ctx.busy ||
    !plan ||
    (plan.kind === 'refine'
      ? plan.refine.blocked !== null || plan.refine.cost === null || (have !== null && have < plan.refine.cost) || !spare
      : plan.kind === 'forge'
        ? !plan.forge || plan.forge.blocked !== null
        : true);
}

/** What the copy on the anvil does now, against what it will do. */
function renderEffects(ctx: ForgeContext, copy: GearCopy | undefined, plan: Plan | null): void {
  ctx.ui.effects.textContent = '';
  if (!copy || !plan) return;
  let rows: EffectRow[];
  if (plan.kind === 'refine' && plan.refine.after) rows = compare(copy.effects, plan.refine.after);
  // The waiting bonus's line gives way to what it does once forged.
  else if (plan.kind === 'forge' && plan.forge?.after) rows = compare(withoutDormant(copy.effects), plan.forge.after);
  else rows = copy.effects.map((line) => ({ line, changes: [], state: 'same' }));
  fillEffects(ctx.ui.effects, rows);
}
