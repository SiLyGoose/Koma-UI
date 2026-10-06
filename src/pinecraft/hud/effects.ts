import type { PinecraftOre } from '../protocol';
import { materialOf, play } from '../sfx';
import { state } from '../state';
import { ui } from '../ui';

/** Text floating up from block (x, y). */
export function floatText(x: number, y: number, text: string, color: string): void {
  const { scene, size } = state;
  if (!scene) return;
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.color = color;
  el.style.left = `${(x + 0.5 - scene.cam.x) * size.block}px`;
  el.style.top = `${(y + 0.3 - scene.cam.y) * size.block}px`;
  ui.floaters.append(el);
  setTimeout(() => el.remove(), 1000);
}

/** The sounds of blocks breaking: each kind once (a blast breaks many), then a chime for any gem. */
export function breakSounds(blocks: { ground: 'dirt' | 'stone'; ore: PinecraftOre | null }[]): void {
  const kinds = new Set(blocks.map((b) => materialOf(b.ground, b.ore)));
  if (kinds.has('dirt')) play('breakDirt');
  if (kinds.has('stone')) play('breakStone');
  if (kinds.has('gem')) {
    play('breakGem');
    setTimeout(() => play('collectGem', 0.2), 120);
  }
}
