import { centerCamera } from './camera';
import { STEP_MS, SWING_MS } from './constants';
import { finishBreaking, move, stopBreaking } from './digging';
import { drawScene, stepParticles } from './draw';
import { KEYS_STAY_MS } from './how-to-play';
import { renderEnergy, setText } from './hud';
import { coords } from './map';
import { play } from './sfx';
import { held, state } from './state';
import { g, ui } from './ui';

let lastFrame = performance.now();

/** Every frame: breaking blocks and walking while a direction is held, the character sliding, and the mine drawn. */
export function frame(now: number): void {
  const dt = Math.min(64, now - lastFrame);
  lastFrame = now;
  const { scene, size } = state;
  if (scene && size.block > 0) {
    if (scene.keysGoneAt === null && (scene.state.x !== state.keysFrom.x || scene.state.y !== state.keysFrom.y)) scene.keysGoneAt = now + KEYS_STAY_MS;
    // Breaking a block: let go (or turn) and it starts over; hold on long enough and it breaks.
    const dir = held[held.length - 1];
    const { breaking } = state;
    if (breaking) {
      if (dir !== breaking.dir) stopBreaking();
      else if (now - breaking.since >= breaking.takes) finishBreaking();
      else if (now >= breaking.nextHit) {
        // The pickaxe strikes: stone rings and gems chink (dirt makes no sound until it breaks).
        if (breaking.material !== 'dirt') play(breaking.material === 'gem' ? 'hitGem' : 'hitStone');
        breaking.nextHit += SWING_MS;
      }
    }
    // Keep going while a direction is held.
    if (dir && state.pendingDig === null && !state.breaking && now - state.lastStep >= STEP_MS) move(dir);

    const k = Math.min(1, dt / 45);
    scene.character.x += (state.target.x - scene.character.x) * k;
    scene.character.y += (state.target.y - scene.character.y) * k;
    centerCamera(false);
    stepParticles(scene, dt, now);
    drawScene(g, scene, size.w, size.h, size.block, now);
    renderEnergy(now);
    const at = coords();
    if (at) setText(ui.coords, `${at.x},${at.y}`);
  }
  requestAnimationFrame(frame);
}
