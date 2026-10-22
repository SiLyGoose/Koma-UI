import { type ArmoryCopy, el, forgePlan, type GearCopy, heroGear, type Plan, rich } from '../../shared/items';
import { working } from '../../shared/ui';
import { points } from '../../shared/util';
import { card } from './card';
import { compare, type EffectRow } from './compare';
import { balance, choosing, copyById, type ForgeContext } from '../context';
import { renderCost } from './cost';
import { fillEffects } from './effects';
import { hintFor } from './hint';
import { renderHeroAnvil } from './hero';

/** Every refine works for now: no chance of failing, so nothing to make up for it. */
const SUCCESS_RATE = 100;
const FAILURE_BONUS = 0;

/**
 * The anvil: the hint, the target and its material, the odds, what changes, the price and the button. Refining; the menu's
 * other modes (a hero's gear's substats and effect) are ./hero.ts's.
 */
export function renderAnvil(ctx: ForgeContext): void {
  if (ctx.mode && ctx.mode !== 'refine') return renderHeroAnvil(ctx, ctx.mode);
  const { ui } = ctx;
  const copy = copyById(ctx, ctx.picked);
  const plan = copy ? forgePlan(copy) : null;
  showHint(ctx, hintFor(ctx, copy, plan));
  showTarget(ctx, copy);
  // What it uses up: the spare picked for a refine (the slot waiting for one until then).
  const spare = plan?.kind === 'refine' ? copyById(ctx, ctx.material) : undefined;
  ui.material.replaceChildren(spare ? card(spare) : el('span', 'anvil-empty'));
  ui.material.classList.toggle('filled', !!spare);
  ui.material.classList.toggle('waiting', !spare && !!choosing(ctx)?.size);
  ui.material.title = spare ? 'Take it off the anvil' : '';

  ui.rate.textContent = `${SUCCESS_RATE}%`;
  ui.bonus.textContent = `+${FAILURE_BONUS}%`;
  renderEffects(ctx, copy, plan);
  renderCost(ctx, plan);

  const have = balance(ctx);
  // (A hero's gear is awakened, King's Raid's: its stars.)
  ui.go.textContent = copy && heroGear(copy) ? 'Awaken Gear' : 'Refine Gear';
  working(ui.go, ctx.busy, 'strike');
  ui.go.disabled =
    plan?.kind !== 'refine' || plan.refine.blocked !== null || plan.refine.cost === null || (have !== null && have < plan.refine.cost) || !spare;
}

/** The line over the slots (hint.ts), green or red by its tone. */
export function showHint(ctx: ForgeContext, hint: { text: string; tone?: 'good' | 'bad' }): void {
  const { ui } = ctx;
  ui.hint.textContent = '';
  ui.hint.append(rich(hint.text));
  ui.hint.classList.toggle('good', hint.tone === 'good');
  ui.hint.classList.toggle('bad', hint.tone === 'bad');
}

/** The copy on the anvil in its Target slot (empty without one), the anvil's edge its tier's colour. */
export function showTarget(ctx: ForgeContext, copy: ArmoryCopy | undefined): void {
  const { ui } = ctx;
  ui.anvil.dataset.stars = copy ? String(copy.stars) : '';
  ui.target.replaceChildren(copy ? card(copy) : el('span', 'anvil-empty'));
  ui.target.classList.toggle('filled', !!copy);
  ui.target.title = copy ? 'Take it off the anvil' : '';
}

/** What the copy on the anvil does now (its main stat first), against what it will do. */
function renderEffects(ctx: ForgeContext, copy: GearCopy | undefined, plan: Plan | null): void {
  ctx.ui.effects.textContent = '';
  if (!copy || !plan) return;
  let rows: EffectRow[];
  if (plan.kind === 'refine' && plan.refine.after) rows = compare(copy.effects, plan.refine.after);
  else rows = copy.effects.map((line) => ({ line, changes: [], state: 'same' }));
  const main = mainRow(copy, plan);
  fillEffects(ctx.ui.effects, main ? [main, ...rows] : rows);
}

/** Its main stat's row (a unique weapon's ATK, a unique treasure's HP: higher with its stars), as it will be after a refine; null: none. */
function mainRow(copy: GearCopy, plan: Plan): EffectRow | null {
  if (!copy.mainStat) return null;
  const { name, value } = copy.mainStat;
  const line = `**${name}** ${points(value)}`;
  const after = plan.kind === 'refine' ? plan.refine.mainAfter : null;
  if (!after || after.value === value) return { line, changes: [], state: 'same' };
  return { line, changes: [{ from: points(value), to: points(after.value), at: 0 }], state: 'changed' };
}
