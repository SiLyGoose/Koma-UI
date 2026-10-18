import { el } from './dom';

/*
 * The top right of the field: the raid's time left (the boss is enraged once it is up), and the way out
 * of the raid.
 */

export interface Timer {
  /** Seconds of the raid's time left (0 or less: it is up); and a raid of more than one wave, the one it is on (`wave` of `of`: King's Raid's "PHASE" mark, left of the time). */
  draw(left: number, wave?: number, of?: number): void;
}

/** King's Raid's own marks of a raid's phases (its NguiAtlas_UI_Prefab_Raid's RiadBoss_Phase01 to 03). */
const PHASE = (n: number): string => `${import.meta.env.BASE_URL}technomagic/hud/phase-${n}.webp`;

/** "3:28": whole seconds, rounded up, so it says 0:00 only once the time is up. */
const said = (left: number): string => {
  const seconds = Math.max(0, Math.ceil(left));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** The timer in `root`, and after it Leave raid, which tells `leave`. */
export function makeTimer(root: HTMLElement, leave: () => void): Timer {
  const clock = el('div', 'tm-timer-clock');
  clock.setAttribute('role', 'timer');
  const skull = el('span', 'tm-timer-skull', '💀');
  skull.setAttribute('aria-hidden', 'true');
  const time = el('b', '');
  clock.append(skull, time);

  const button = el('button', 'tm-leave');
  button.type = 'button';
  button.title = 'Leave raid';
  button.setAttribute('aria-label', 'Leave raid');
  const door = el('span', '', '🚪');
  door.setAttribute('aria-hidden', 'true');
  button.append(door, el('span', 'tm-leave-words', 'Leave'));
  button.addEventListener('click', leave);

  const phase = el('img', 'tm-phase');
  phase.alt = '';
  phase.hidden = true;
  root.append(phase, clock, button);

  let shown = '';
  let wave = 0;
  return {
    draw(left, now = 1, of = 1) {
      // (Only for a raid of more than one wave.)
      const on = of > 1 ? Math.min(3, now) : 0;
      if (on !== wave) {
        wave = on;
        phase.hidden = on === 0;
        if (on > 0) {
          phase.src = PHASE(on);
          phase.alt = `Phase ${on} of ${of}`;
        }
      }
      const text = said(left);
      if (text === shown) return;
      shown = text;
      time.textContent = text;
      const up = left <= 0;
      clock.classList.toggle('up', up);
      clock.classList.toggle('soon', !up && left <= 30);
      clock.title = up ? 'Time is up: the boss is enraged' : 'Time left before the boss is enraged';
    },
  };
}
