import { state } from '../state';
import { ui } from '../ui';

/*
 * How to play: the keys drawn in the ground under the start (draw/draw-scene.ts), 2 blocks further down on a
 * computer and 3 in the phone layout (as ../pinecraft.css has it); on a touch screen, where the keys
 * don't apply, in words over the mine too, until the first move.
 */

const phoneLayout = matchMedia('(pointer: coarse), (max-width: 759px), (max-height: 519px)');
/** How long how to play stays once the character first leaves where they started. */
export const KEYS_STAY_MS = 5000;

/** How many blocks under the start the keys are drawn. */
export function keysGap(): number {
  return phoneLayout.matches ? 3 : 2;
}

export function setUpHowToPlay(): void {
  phoneLayout.addEventListener('change', () => {
    if (state.scene) state.scene.keysGap = keysGap();
  });
  if (matchMedia('(pointer: coarse)').matches) {
    ui.log.textContent = 'Touch and drag anywhere on the mine to walk · hold against a block to break it. Every block takes one ⚡; harder ones take longer.';
    state.startTip = ui.log.textContent;
  }
}
