import { sound } from '../shared/audio';
import { el, type GearCopy, levelLabel } from '../shared/items';
import { card, compare, fillEffects } from './anvil';
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
  if (success) {
    const sub = el('p', 'forge-result-sub', `${after.name} · ${levelLabel(before)} » ${levelLabel(after)}`);
    const burst = el('div', 'forge-result-burst');
    burst.append(el('span', 'forge-result-rays'), el('span', 'forge-result-rays back'), el('span', 'forge-result-core'), card(after));
    const list = el('ul', 'forge-effects');
    fillEffects(list, compare(before.effects, after.effects));
    const panel = el('div', 'forge-result-panel');
    panel.append(list);
    box.append(title, sub, burst, panel);
  } else {
    const sub = el('p', 'forge-result-sub', `${after.name} is still ${levelLabel(after)}.`);
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

export const resultOpen = (ctx: ForgeContext): boolean => ctx.ui.result.classList.contains('on');

export function closeResult(ctx: ForgeContext): void {
  ctx.ui.result.classList.remove('on');
  ctx.ui.go.focus();
}
