import { showWatching, watchBack } from '../shared/live';
import { apply } from './apply';
import { STEP } from './constants';
import { cellAt } from './draw';
import { breakTime } from './digging';
import type { Direction, WorldEvent, WorldState } from './protocol';
import { state } from './state';

/* Watching someone dig: their moves come from the bot, not the keys. */

let watchBreak: ReturnType<typeof setTimeout> | null = null;

/** The player started on a block. Its cracks grow as theirs do (until the bot says how it went). */
export function watchBreaking(dir: Direction): void {
  const { scene } = state;
  if (!scene) return;
  const world = scene.state;
  const x = world.x + STEP[dir][0];
  const y = world.y + STEP[dir][1];
  const now = performance.now();
  const takes = breakTime(cellAt(scene, x, y));
  if (dir === 'left' || dir === 'right') scene.facing = dir === 'left' ? -1 : 1;
  scene.digging = { x, y, since: now, takes };
  scene.swing = { since: now, dir };
  // They let go before it broke: the cracks go a moment after it would have.
  if (watchBreak) clearTimeout(watchBreak);
  watchBreak = setTimeout(() => {
    if (state.scene?.digging?.x === x && state.scene.digging.y === y) {
      state.scene.digging = null;
      state.scene.swing = null;
    }
  }, takes + 1500);
}

/** The bot's word on the player's world. The character goes where it says, and a dig is where they now stand. */
export function watchState(world: WorldState, event: WorldEvent | undefined): void {
  const { scene, watched } = state;
  if (watched) {
    showWatching(watched);
    watchBack();
  }
  if (scene && world.x !== scene.state.x) scene.facing = world.x < scene.state.x ? -1 : 1;
  if (scene) {
    scene.digging = null;
    scene.swing = null;
  }
  apply(world, event, true, event?.kind === 'dig' ? { x: world.x, y: world.y } : null);
}
