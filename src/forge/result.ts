import { sound } from '../shared/audio';
import { type ArmoryCopy, el, type GearCopy, levelLabel, rich, shownName } from '../shared/items';
import type { HeroCopy, HeroKeep } from '../shared/heroes';
import { card, compare, fillEffects } from './anvil';
import type { EffectRow } from './anvil/compare';
import type { ForgeContext } from './context';

/** A refine that worked (public/forge/sfx), through the shared ../shared/audio/sfx.ts. */
const succeeded = sound(`${import.meta.env.BASE_URL}forge/sfx/forge_item_success.mp3`);

/**
 * Shows what a refine did, over the page blurred. When it worked: SUCCESS, the copy as it is
 * now in a burst of light, and what it did before against now. When it didn't take: FAIL in cold
 * silver, and the copy as it still is, with a shudder and no light (and no sound). Built afresh each
 * time, so its entrance plays again.
 */
export function showResult(ctx: ForgeContext, before: GearCopy, after: GearCopy, success: boolean): void {
  const { ui } = ctx;
  const box = el('div', 'forge-result-box');
  const title = el('h2', 'forge-result-title', success ? 'SUCCESS' : 'FAIL');
  title.id = 'result-title';
  ui.result.classList.toggle('fail', !success);
  ui.result.classList.remove('choice');
  if (success) {
    const sub = el('p', 'forge-result-sub', `${shownName(after)} · ${levelLabel(before)} » ${levelLabel(after)}`);
    const burst = el('div', 'forge-result-burst');
    burst.append(el('span', 'forge-result-rays'), el('span', 'forge-result-rays back'), el('span', 'forge-result-core'), card(after));
    const list = el('ul', 'forge-effects');
    fillEffects(list, compare(before.effects, after.effects));
    const panel = el('div', 'forge-result-panel');
    panel.append(list);
    box.append(title, sub, burst, panel);
  } else {
    const sub = el('p', 'forge-result-sub', `${shownName(after)} is still ${levelLabel(after)}.`);
    const still = el('div', 'forge-result-still');
    still.append(card(after));
    box.append(title, sub, still);
  }
  box.append(el('p', 'forge-result-tap', 'Click anywhere to continue.'));
  ui.result.replaceChildren(box);
  if (success) succeeded();
  ui.result.classList.add('on');
  ui.result.focus();
}

/**
 * Shows what a hero's gear's reroll or enhance did, over the page blurred, as a refine that worked: SUCCESS, what was done
 * (`sub`), the copy as it is now in a burst of light, and its substats (or effect) before against now.
 */
export function showChange(ctx: ForgeContext, after: ArmoryCopy, sub: string, rows: readonly EffectRow[]): void {
  const { ui } = ctx;
  const box = el('div', 'forge-result-box');
  const title = el('h2', 'forge-result-title', 'SUCCESS');
  title.id = 'result-title';
  ui.result.classList.remove('fail', 'choice');
  const burst = el('div', 'forge-result-burst');
  burst.append(el('span', 'forge-result-rays'), el('span', 'forge-result-rays back'), el('span', 'forge-result-core'), card(after));
  const list = el('ul', 'forge-effects');
  fillEffects(list, rows);
  const panel = el('div', 'forge-result-panel');
  panel.append(list);
  box.append(title, el('p', 'forge-result-sub', `${shownName(after)} · ${sub}`), burst, panel, el('p', 'forge-result-tap', 'Click anywhere to continue.'));
  ui.result.replaceChildren(box);
  succeeded();
  ui.result.classList.add('on');
  ui.result.focus();
}

/**
 * Shows what an effect's reroll rolled, as a change that worked, but with the effect it has and the one rolled each a button
 * (`keep` is told which is picked): it stays open till one is (or Escape, the anvil still asking which).
 */
export function showEffectChoice(ctx: ForgeContext, copy: HeroCopy, keep: (which: HeroKeep) => void): void {
  const { ui } = ctx;
  const box = el('div', 'forge-result-box');
  const title = el('h2', 'forge-result-title', 'SUCCESS');
  title.id = 'result-title';
  ui.result.classList.remove('fail');
  ui.result.classList.add('choice');
  const burst = el('div', 'forge-result-burst');
  burst.append(el('span', 'forge-result-rays'), el('span', 'forge-result-rays back'), el('span', 'forge-result-core'), card(copy));
  const list = el('ul', 'forge-effects');
  const choices: { which: HeroKeep; tag: string; line: string | null }[] = [
    { which: 'old', tag: 'Keep current', line: copy.additional },
    { which: 'new', tag: 'Take new', line: copy.rerolled },
  ];
  for (const choice of choices) {
    const row = el('li', 'forge-row forge-option');
    const pick = el('button', 'forge-option-pick forge-keep');
    pick.type = 'button';
    const line = el('span', 'forge-line');
    line.append(choice.line ? rich(choice.line) : 'No additional effect.');
    pick.append(line, el('span', `forge-keep-tag ${choice.which}`, choice.tag));
    pick.addEventListener('click', (event) => {
      event.stopPropagation();
      keep(choice.which);
    });
    row.append(pick);
    list.append(row);
  }
  const panel = el('div', 'forge-result-panel');
  panel.append(list);
  box.append(title, el('p', 'forge-result-sub', `${shownName(copy)} · Effect rerolled`), burst, panel, el('p', 'forge-result-tap', 'Pick the effect to keep.'));
  ui.result.replaceChildren(box);
  succeeded();
  ui.result.classList.add('on');
  // (Not on a choice: an Enter out of habit picks nothing.)
  ui.result.focus();
}

/** Whether the result open asks which effect to keep (it doesn't close on a click). */
export const choosingEffect = (ctx: ForgeContext): boolean => ctx.ui.result.classList.contains('choice');

export const resultOpen = (ctx: ForgeContext): boolean => ctx.ui.result.classList.contains('on');

export function closeResult(ctx: ForgeContext): void {
  ctx.ui.result.classList.remove('on', 'choice');
  ctx.ui.go.focus();
}
