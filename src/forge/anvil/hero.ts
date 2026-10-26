import { crystalCount, el, rich } from '../../shared/items';
import { type HeroCopy, type HeroKeep, optionPips } from '../../shared/heroes';
import { working } from '../../shared/ui';
import { points } from '../../shared/util';
import { balance, crystals, gems, heroCopyById, type ForgeContext } from '../context';
import { FORGE_MODES, type ForgeMode } from '../modes';
import { render } from '../render';
import { showHint, showTarget } from './anvil';
import { type PriceShown, type PriceUnit, showPrice } from './cost';

/** The menu's modes for a hero's gear (not refining). */
export type HeroMode = Exclude<ForgeMode, 'refine'>;

/** Whether a mode works on one substat, picked under the slots (rerolling it, or rolling its amount again). */
const picksOption = (mode: HeroMode): boolean => mode === 'reroll' || mode === 'enhance';

/** Part of a price: `cost` in `unit`. */
export interface PricePart {
  cost: number;
  unit: PriceUnit;
}

/**
 * What a mode costs for `copy` (rerolling: the substat picked's, else what any costs), each part in what it's paid in (an effect's:
 * komaGems and its set's Boss Crystals); null: it can't be done to it.
 */
export function priceOf(copy: HeroCopy, mode: HeroMode, option: number | null): PricePart[] | null {
  switch (mode) {
    case 'reroll':
      // (A TechnoMagic piece's: its set's Boss Crystals, King's Raid's.)
      return copy.reroll === null || copy.options.length === 0
        ? null
        : [{ cost: (option !== null ? copy.options[option]?.price : undefined) ?? copy.reroll, unit: copy.rerollCrystals ? `crystals:${copy.rerollCrystals}` : 'zeiucoins' }];
    case 'enhance':
      return copy.upgrade === null ? null : [{ cost: copy.upgrade, unit: 'zeiucoins' }];
    case 'effects':
      if (copy.rerollUnique === null) return null;
      return [{ cost: copy.rerollUnique, unit: 'komaGems' }, ...(copy.rerollCrystals && copy.rerollUniqueCrystals ? [{ cost: copy.rerollUniqueCrystals, unit: `crystals:${copy.rerollCrystals}` as const }] : [])];
  }
}

/** How many they have of what a price is paid in (null: not loaded yet). */
const haveOf = (ctx: ForgeContext, unit: PriceUnit): number | null =>
  unit === 'komaGems' ? gems(ctx) : unit.startsWith('crystals:') ? crystals(ctx, unit.slice('crystals:'.length)) : balance(ctx);

/** One side of a reroll waiting to be kept: its line (an effect's: null, none), and a substat's steps. */
export interface KeepLine {
  line: string | null;
  option?: { step: number; steps: number };
}

/** A reroll waiting to be kept: what was rerolled, the one the piece has and the one rolled. */
export interface KeepChoice {
  what: 'effect' | 'substat';
  old: KeepLine;
  new: KeepLine;
}

/**
 * The piece's effect (the effects mode) or one of its substats (rerolling or enhancing) rerolled and waiting for the member to keep
 * the new one or the one it has (King's Raid's Reforge; nothing to pay); null: none waits.
 */
export function keepChoice(copy: HeroCopy | undefined, mode: HeroMode): KeepChoice | null {
  if (!copy) return null;
  if (mode === 'effects') return copy.rerolled ? { what: 'effect', old: { line: copy.additional }, new: { line: copy.rerolled } } : null;
  const rolled = copy.rerolledOption;
  const old = rolled ? copy.options[rolled.index] : undefined;
  return rolled && old ? { what: 'substat', old: { line: old.line, option: old }, new: { line: rolled.line, option: rolled } } : null;
}

/** Whether the piece has a reroll waiting to be kept, in this mode. */
export const keeping = (copy: HeroCopy | undefined, mode: HeroMode): boolean => keepChoice(copy, mode) !== null;

/** A side of a reroll waiting, as a choice shows it: its line (an effect's, rich) and a substat's pips. */
export function keepLine(choice: KeepChoice, side: KeepLine): HTMLElement[] {
  const line = el('span', 'forge-line');
  line.append(side.line ? (choice.what === 'effect' ? rich(side.line) : side.line) : 'No additional effect.');
  return side.option ? [line, optionPips(side.option)] : [line];
}

/**
 * The anvil for a hero's gear: the hint, the piece on it, its substats (rerolling or enhancing: each a button, the one picked) or
 * its effect, the price (zeiucoins; an effect's, komaGems and its set's Boss Crystals; a TechnoMagic piece's substats', its set's Boss Crystals) and the mode's button. Nothing is used up, so no Materials and no odds.
 * An effect or substat rerolled and not yet kept: the one it has and the one rolled, each a button, and Keep for the one picked.
 */
export function renderHeroAnvil(ctx: ForgeContext, mode: HeroMode): void {
  const { ui } = ctx;
  const copy = heroCopyById(ctx, ctx.picked);
  if (ctx.option !== null && (!copy || ctx.option >= copy.options.length)) ctx.option = null;
  const waiting = keepChoice(copy, mode);
  if (!waiting) ctx.keep = null;
  else {
    showHint(ctx, ctx.done ? { text: ctx.done, tone: ctx.doneWell ? 'good' : 'bad' } : { text: ctx.keep === null ? `Pick the ${waiting.what} to keep: the one it has, or the one just rolled.` : 'The other one is gone for good.' });
    showTarget(ctx, copy);
    renderKeep(ctx, waiting);
    // (Nothing to pay, in what the mode costs.)
    const units = (copy ? priceOf(copy, mode, null) : null)?.map((part) => part.unit) ?? ['zeiucoins'];
    showPrice(ctx, units.map((unit) => ({ cost: 0, have: haveOf(ctx, unit), unit, short: false })));
    ui.go.textContent = waiting.what === 'effect' ? 'Keep Effect' : 'Keep Substat';
    working(ui.go, ctx.busy, 'strike');
    ui.go.disabled = ctx.keep === null;
    return;
  }
  const price = copy ? priceOf(copy, mode, ctx.option) : null;
  const parts: PriceShown[] = (price ?? [{ cost: 0, unit: mode === 'effects' ? 'komaGems' : 'zeiucoins' }]).map((part) => {
    const have = haveOf(ctx, part.unit);
    return { ...part, have, short: !!price && have !== null && have < part.cost };
  });
  const short = parts.find((part) => part.short);
  showHint(ctx, heroHint(ctx, mode, copy, price, short));
  showTarget(ctx, copy);
  renderRows(ctx, mode, copy);
  showPrice(ctx, parts);
  ui.go.textContent = FORGE_MODES.find((one) => one.id === mode)?.go ?? '';
  working(ui.go, ctx.busy, 'strike');
  ui.go.disabled = !copy || !price || !!short || (picksOption(mode) && ctx.option === null);
}

/** The line over the slots: what to pick, what's in the way (`short`: a part of the price they haven't enough of), what it will do, or what was just done. */
function heroHint(ctx: ForgeContext, mode: HeroMode, copy: HeroCopy | undefined, price: PricePart[] | null, short: PriceShown | undefined): { text: string; tone?: 'good' | 'bad' } {
  if (ctx.done) return { text: ctx.done, tone: ctx.doneWell ? 'good' : 'bad' };
  if (!copy) {
    if (mode === 'reroll') return { text: 'Pick a piece of hero gear from your armory to reroll one of its substats.' };
    if (mode === 'enhance') return { text: 'Pick a piece of hero gear from your armory to roll one of its substats’ amounts again.' };
    return { text: 'Pick a TechnoMagic piece from your armory to reroll its additional effect.' };
  }
  if (!price) {
    if (mode === 'reroll') return { text: 'This piece has no substats to reroll.', tone: 'bad' };
    if (mode === 'enhance') return { text: 'This piece has no substat values to reroll.', tone: 'bad' };
    return { text: 'This piece has no additional effect to reroll.', tone: 'bad' };
  }
  if (short && short.have !== null) {
    if (short.unit.startsWith('crystals:')) {
      return { text: `You need ${crystalCount(short.unit.slice('crystals:'.length), short.cost - short.have).replace(' ', ' more ')} to do that: its boss's TechnoMagic Raid drops them, and salvaging its set's gear gives them.`, tone: 'bad' };
    }
    return { text: `You need ${points(short.cost - short.have)} more ${short.unit} to do that.`, tone: 'bad' };
  }
  if (mode === 'reroll') return { text: ctx.option === null ? 'Pick the substat to reroll, below.' : 'The substat picked is rolled again, at random: then keep the new one or the one it has.' };
  if (mode === 'enhance') return { text: ctx.option === null ? 'Pick the substat whose value to reroll, below.' : 'The substat picked keeps its stat and rolls its amount again, anywhere in its range: it may go down.' };
  return { text: 'Its additional effect is rolled again, at random: then keep the new one or the one it has.' };
}

/** Under the slots, an effect or substat rerolled: the one it has and the one rolled, each a button (the one picked is kept). */
function renderKeep(ctx: ForgeContext, waiting: KeepChoice): void {
  const { ui } = ctx;
  ui.effects.textContent = '';
  const choices: { keep: HeroKeep; tag: string; side: KeepLine }[] = [
    { keep: 'old', tag: 'Current', side: waiting.old },
    { keep: 'new', tag: 'New', side: waiting.new },
  ];
  for (const choice of choices) {
    const row = el('li', 'forge-row forge-option');
    const pick = el('button', 'forge-option-pick');
    pick.type = 'button';
    pick.setAttribute('aria-pressed', String(ctx.keep === choice.keep));
    pick.disabled = !!ctx.busy;
    pick.append(...keepLine(waiting, choice.side), el('span', `forge-keep-tag ${choice.keep}`, choice.tag));
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
