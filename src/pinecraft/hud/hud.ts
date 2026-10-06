import { points, replay } from '../../shared/util';
import type { WorldState } from '../protocol';
import { state } from '../state';
import { ui } from '../ui';

const clock = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Sets `el`'s text if it changed, with a bump (`bumpIt`) once it has had a value. */
export function setText(el: HTMLElement, text: string, bumpIt = false): void {
  if (el.textContent === text) return;
  const before = el.textContent;
  el.textContent = text;
  if (bumpIt && before !== '–') replay(el, 'bump');
}

/** The energy bar, counting up what has come back since the bot last said. */
export function renderEnergy(now: number): void {
  const { energy } = state;
  while (energy.nextAt !== null && now >= energy.nextAt && energy.count < energy.max) {
    energy.count++;
    energy.nextAt = energy.count >= energy.max ? null : energy.nextAt + energy.every;
  }
  setText(ui.energy, `${energy.count} / ${energy.max}`);
  ui.energyFill.style.width = `${energy.max > 0 ? (100 * energy.count) / energy.max : 0}%`;
  ui.energyFill.classList.toggle('low', energy.count < Math.max(1, energy.max * 0.15));
  ui.energyNext.textContent = energy.nextAt === null ? 'Full' : `+1 in ${clock(energy.nextAt - now)}`;
}

/** The stats bar: balance, earned, blocks dug, and the Dynamite Stick's countdown. */
export function renderHud(world: WorldState): void {
  setText(ui.balance, world.balance === null ? '–' : points(world.balance), true);
  setText(ui.earned, points(world.earned), true);
  setText(ui.depth, points(world.dug));
  // With a Dynamite Stick: the blocks until the next blast.
  ui.blast.hidden = !world.blast;
  if (world.blast) {
    setText(ui.blastLeft, world.blast.left === 1 ? 'next block' : `in ${world.blast.left} blocks`);
    ui.blast.classList.toggle('soon', world.blast.left === 1);
  }
}
