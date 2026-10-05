import { closeMap, openMap } from '../map';
import type { Direction } from '../protocol';
import { held, state } from '../state';
import { press, release } from './held';

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

/** The arrows and WASD walk and dig; M opens the map (Escape closes it). */
export function wireKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // The leaderboard is open: the keys are its (Escape closes it).
    if (state.leaderboard?.isOpen()) return;
    if (e.code === 'KeyM' && !e.repeat) {
      e.preventDefault();
      if (state.mapOpen) closeMap();
      else openMap();
      return;
    }
    if (state.mapOpen) {
      if (e.code === 'Escape') closeMap();
      return;
    }
    const dir = KEYS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (!e.repeat) press(dir);
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEYS[e.code];
    if (dir) release(dir);
  });
  window.addEventListener('blur', () => (held.length = 0));
}
