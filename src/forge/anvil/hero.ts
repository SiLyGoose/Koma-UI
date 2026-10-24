import { crystalCount, el, rich } from '../../shared/items';
import { type HeroCopy, type HeroKeep, optionPips } from '../../shared/heroes';
import { working } from '../../shared/ui';
import { points } from '../../shared/util';
import { balance, crystals, gems, heroCopyById, type ForgeContext } from '../context';
import { FORGE_MODES, type ForgeMode } from '../modes';
import { render } from '../render';
import { showHint, showTarget } from './anvil';
import { type PriceUnit, showPrice } from './cost';

/** The menu's modes for a hero's gear (not refining). */
export type HeroMode = Exclude<ForgeMode, 'refine'>;

/** Whether a mode works on one substat, picked under the slots (rerolling it, or rolling its amount again). */
const picksOption = (mode: HeroMode): boolean => mode === 'reroll' || mode === 'enhance';

/** What a mode costs for `copy` (rerolling: the substat picked's, else what any costs), and in what; null: it can't be done to it. */
export function priceOf(copy: HeroCopy, mode: HeroMode, option: number | null): { cost: number; unit: PriceUnit } | null {
  switch (mode) {
    case 'reroll':
      // (A TechnoMagic piece's: its set's Boss Crystals, King's Raid's.)
      return copy.reroll === null || copy.options.length === 0
        ? null
        : { cost: (option !== null ? copy.options[option]?.price : undefined) ?? copy.reroll, unit: copy.rerollCrystals ? `crystals:${copy.rerollCrystals}` : 'zeiucoins' };
    case 'enhance':
      return copy.upgrade === null ? null : { cost: copy.upgrade, unit: 'zeiucoins' };
    case 'effects':
      return copy.rerollUnique === null ? null : { cost: copy.rerollUnique, unit: 'komaGems' };
  }
}

/** Whether the piece's effect was rerolled and waits for the member to keep the new one or the one it has (nothing to pay). */
export const keeping = (copy: HeroCopy | undefined, mode: HeroMode): copy is HeroCopy => mode === 'effects' && !!copy?.rerolled;

/**
 * The anvil for a hero's gear: the hint, the piece on it, its substats (rerolling or enhancing: each a button, the one picked) or
 * its effect, the price (zeiucoins; an effect's, komaGems; a TechnoMagic piece's substats', its set's Boss Crystals) and the mode's button. Nothing is used up, so no Materials and no odds.
 * An effect rerolled and not yet kept: its effect and the one rolled, each a button, and Keep Effect for the one picked.
 */
export function renderHeroAnvil(ctx: ForgeContext, mode: HeroMode): void {
  const { ui } = ctx;
  const copy = heroCopyById(ctx, ctx.picked);
  if (ctx.option !== null && (!copy || ctx.option >= copy.options.length)) ctx.option = null;
  if (!keeping(copy, mode)) ctx.keep = null;
  else {
    showHint(ctx, ctx.done ? { text: ctx.done, tone: ctx.doneWell ? 'good' : 'bad' } : { text: ctx.keep === null ? 'Pick the effect to keep: the one it has, or the one just rolled.' : 'The other one is gone for good.' });
    showTarget(ctx, copy);
    renderKeep(ctx, copy);
    showPrice(ctx, 0, gems(ctx), 'komaGems', false);
    ui.go.textContent = 'Keep Effect';
    working(ui.go, ctx.busy, 'strike');
    ui.go.disabled = ctx.keep === null;
    return;
  }
  const price = copy ? priceOf(copy, mode, ctx.option) : null;
  const have = price?.unit === 'komaGems' ? gems(ctx) : price?.unit.startsWith('crystals:') ? crystals(ctx, price.unit.slice('crystals:'.length)) : balance(ctx);
  const short = !!price && have !== null && have < price.cost;
  showHint(ctx, heroHint(ctx, mode, copy, price, have));
  showTarget(ctx, copy);
  renderRows(ctx, mode, copy);
  showPrice(ctx, price?.cost ?? 0, have, price?.unit ?? (mode === 'effects' ? 'komaGems' : 'zeiucoins'), short);
  ui.go.textContent = FORGE_MODES.find((one) => one.id === mode)?.go ?? '';
  working(ui.go, ctx.busy, 'strike');
  ui.go.disabled = !copy || !price || short || (picksOption(mode) && ctx.option === null);
}

/** The line over the slots: what to pick, what's in the way, what it will do, or what was just done. */
function heroHint(ctx: ForgeContext, mode: HeroMode, copy: HeroCopy | undefined, price: ReturnType<typeof priceOf>, have: number | null): { text: string; tone?: 'good' | 'bad' } {
  if (ctx.done) return { text: ctx.done, tone: ctx.doneWell ? 'good' : 'bad' };
  if (!copy) {
    if (mode === 'reroll') return { text: 'Pick a piece of hero gear from your armory to reroll one of its substats.' };
    if (mode === 'enhance') return { text: 'Pick a piece of hero gear from your armory to roll one of its substats’ amounts again.' };
    return { text: 'Pick a TechnoMagic piece from your armory to reroll its additional effect.' };
  }
  if (!price) {
    if (mode === 'reroll') return { text: 'This piece has no substats to reroll.', tone: 'bad' };
    if (mode === 'enhance') return { text: 'This piece has no substats to enhance.', tone: 'bad' };
    return { text: 'This piece has no additional effect to reroll.', tone: 'bad' };
  }
  if (have !== null && have < price.cost) {
    if (price.unit.startsWith('crystals:')) {
      return { text: `You need ${crystalCount(price.unit.slice('crystals:'.length), price.cost - have).replace(' ', ' more ')} to do that: its boss's TechnoMagic Raid drops them, and salvaging its set's gear gives them.`, tone: 'bad' };
    }
    return { text: `You need ${points(price.cost - have)} more ${price.unit} to do that.`, tone: 'bad' };
  }
  if (mode === 'reroll') return { text: ctx.option === null ? 'Pick the substat to reroll, below.' : 'The substat picked is rolled again: a new one takes its place, at random.' };
  if (mode === 'enhance') return { text: ctx.option === null ? 'Pick the substat to enhance, below.' : 'The substat picked keeps its stat and rolls its amount again, anywhere in its range: it may go down.' };
  return { text: 'Its additional effect is rolled again, at random: then keep the new one or the one it has.' };
}

/** Under the slots, an effect rerolled: the one it has and the one rolled, each a button (the one picked is kept). */
function renderKeep(ctx: ForgeContext, copy: HeroCopy): void {
  const { ui } = ctx;
  ui.effects.textContent = '';
  const choices: { keep: HeroKeep; tag: string; line: string | null }[] = [
    { keep: 'old', tag: 'Current', line: copy.additional },
    { keep: 'new', tag: 'New', line: copy.rerolled },
  ];
  for (const choice of choices) {
    const row = el('li', 'forge-row forge-option');
    const pick = el('button', 'forge-option-pick');
    pick.type = 'button';
    pick.setAttribute('aria-pressed', String(ctx.keep === choice.keep));
    pick.disabled = !!ctx.busy;
    const line = el('span', 'forge-line');
    line.append(choice.line ? rich(choice.line) : 'No additional effect.');
    pick.append(line, el('span', `forge-keep-tag ${choice.keep}`, choice.tag));
    pick.addEventListener('click', () => {
      ctx.done = null;
      ctx.keep = ctx.keep === choice.keep ? null : choice.keep;
      render(ctx);
    });
    row.append(pick);
    ui.effects.append(row);
  }
}

/**
 * Under the slots: its substats, each its line and steps (rerolling or enhancing, each a button: the one picked is done), or (an
 * effect's mode) its additional effect.
 */
function renderRows(ctx: ForgeContext, mode: HeroMode, copy: HeroCopy | undefined): void {
  const { ui } = ctx;
  ui.effects.textContent = '';
  if (!copy) return;
  if (mode === 'effects') {
    const row = el('li', 'forge-row');
    row.append(copy.additional ? rich(copy.additional) : 'No additional effect.');
    ui.effects.append(row);
    return;
  }
  copy.options.forEach((option, i) => {
    const row = el('li', 'forge-row forge-option');
    const line = el('span', 'forge-line', option.line);
    if (!picksOption(mode)) {
      row.append(line, optionPips(option));
      return void ui.effects.append(row);
    }
    // Rerolling or enhancing: the substat to do it to, picked (again: none).
    const pick = el('button', 'forge-option-pick');
    pick.type = 'button';
    pick.setAttribute('aria-pressed', String(ctx.option === i));
    pick.disabled = !!ctx.busy;
    pick.append(line, optionPips(option));
    pick.addEventListener('click', () => {
      ctx.done = null;
      ctx.option = ctx.option === i ? null : i;
      render(ctx);
    });
    row.append(pick);
    ui.effects.append(row);
  });
  if (copy.options.length === 0) ui.effects.append(el('li', 'forge-row muted', 'No substats.'));
}
