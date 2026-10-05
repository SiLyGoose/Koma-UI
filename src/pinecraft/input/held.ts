import { STEP_MS } from '../constants';
import { move } from '../digging';
import type { Direction } from '../protocol';
import { held, state } from '../state';

/** A direction pressed (a key, the joystick): a step that way now, if one is due, and more while it's held. */
export function press(dir: Direction): void {
  if (!held.includes(dir)) held.push(dir);
  if (performance.now() - state.lastStep >= STEP_MS) move(dir);
}

export function release(dir: Direction): void {
  const k = held.indexOf(dir);
  if (k >= 0) held.splice(k, 1);
  state.refused = null;
}
