import { replay } from '../shared/util';
import { send, connected } from './net/connection';
import { DEFAULT_BREAK_MS, STEP, STRIKE_MS } from './constants';
import { cellAt, isBedrock, isOpenCell, ORE_OF } from './draw';
import { watching } from '../shared/game';
import type { Direction } from './protocol';
import { materialOf, play } from './sfx';
import { state } from './state';
import { ui } from './ui';

/** How long the block with letter `c` takes to break. */
export function breakTime(c: string): number {
  const times = state.scene?.state.breakMs;
  if (!times) return DEFAULT_BREAK_MS;
  const ore = ORE_OF[c];
  return ore ? times[ore] : c === 's' ? times.stone : times.dirt;
}

/** Lets go of the block being broken (it starts over next time). */
export function stopBreaking(): void {
  if (!state.breaking) return;
  state.breaking = null;
  if (state.scene && state.pendingDig === null) {
    state.scene.digging = null;
    state.scene.swing = null;
  }
}

/** The block is broken: tell the bot, and wait for its answer. */
export function finishBreaking(): void {
  const done = state.breaking;
  if (!done) return;
  state.breaking = null;
  state.seq += 1;
  state.pendingDig = { seq: state.seq, x: done.x, y: done.y, since: done.since };
  send({ t: 'move', dir: done.dir, seq: state.seq });
}

/** Can't break block (x, y): the cancel sound, once until the direction is let go. */
function refuse(x: number, y: number): void {
  const key = `${x},${y}`;
  if (state.refused !== key) play('cancel');
  state.refused = key;
}

/** One step `dir`: through open ground, or starting to break the block there. */
export function move(dir: Direction): void {
  const { scene } = state;
  if (watching || !scene || state.pendingDig !== null || !connected()) return;
  if (state.startTip !== null && ui.log.textContent === state.startTip) ui.log.textContent = '';
  state.startTip = null;
  const world = scene.state;
  const now = performance.now();
  state.lastStep = now;
  if (dir === 'left' || dir === 'right') scene.facing = dir === 'left' ? -1 : 1;
  const x = world.x + STEP[dir][0];
  const y = world.y + STEP[dir][1];
  if (state.breaking && state.breaking.x === x && state.breaking.y === y) return;
  stopBreaking();
  if (x < 0 || y < 0 || x >= world.size || y >= world.size) return;
  const c = cellAt(scene, x, y);
  if (isBedrock(c)) return refuse(x, y);
  // An ore can take more than one energy (a Golden Pickaxe).
  if (!isOpenCell(c) && state.energy.count < (ORE_OF[c] ? (world.oreEnergy ?? 1) : 1)) {
    replay(ui.energy.parentElement as HTMLElement, 'shake');
    return refuse(x, y);
  }
  state.refused = null;
  if (isOpenCell(c)) {
    // Open ground: go now, tell the bot after.
    play('footstep', 0.1);
    state.seq += 1;
    world.x = x;
    world.y = y;
    state.target = { x, y };
    send({ t: 'move', dir, seq: state.seq });
    return;
  }
  const takes = breakTime(c);
  const ore = ORE_OF[c] ?? null;
  state.breaking = { dir, x, y, since: now, takes, material: materialOf(c === 's' ? 'stone' : 'dirt', ore), nextHit: now + STRIKE_MS };
  scene.digging = { x, y, since: now, takes };
  scene.swing = { since: now, dir };
  send({ t: 'mine', dir });
}
