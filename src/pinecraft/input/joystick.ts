import type { Direction } from '../protocol';
import { ui } from '../ui';
import { press, release } from './held';

/*
 * Phones: touch anywhere on the mine and a joystick shows up under the finger, and stays there
 * until it lifts. Drag to walk, and hold against a block to break it.
 */

/** How far the knob goes from the joystick's middle, in px, and how far before it counts. */
const STICK_REACH = 36;
const STICK_DEAD = 12;
/** Half the ring's size (.pc-stick in the styles). */
const STICK_HALF = 55;
/** The finger on the joystick, and the joystick's middle, in px from the stage's top left. */
let stick: { id: number; x: number; y: number } | null = null;
let stickDir: Direction | null = null;

/** Holds `dir` (null: none), letting go of the one held before. */
export function setStick(dir: Direction | null): void {
  if (dir === stickDir) return;
  if (stickDir) release(stickDir);
  stickDir = dir;
  if (dir) press(dir);
}

function steer(e: PointerEvent): void {
  if (!stick) return;
  const rect = ui.stage.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let dx = x - stick.x;
  let dy = y - stick.y;
  const d = Math.hypot(dx, dy);
  setStick(d < STICK_DEAD ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  // Past the edge the knob stops there; the joystick itself stays put.
  if (d > STICK_REACH) {
    dx *= STICK_REACH / d;
    dy *= STICK_REACH / d;
  }
  ui.stick.style.transform = `translate(${stick.x - STICK_HALF}px, ${stick.y - STICK_HALF}px)`;
  ui.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}

export function wireJoystick(): void {
  ui.stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || stick) return;
    e.preventDefault();
    // Close the ore tooltip if it was tapped open.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    ui.stage.setPointerCapture(e.pointerId);
    const rect = ui.stage.getBoundingClientRect();
    stick = { id: e.pointerId, x: e.clientX - rect.left, y: e.clientY - rect.top };
    ui.stick.classList.add('on');
    steer(e);
  });
  ui.stage.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick?.id) steer(e);
  });
  for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    ui.stage.addEventListener(end, (e) => {
      if (e.pointerId !== stick?.id) return;
      stick = null;
      ui.stick.classList.remove('on');
      ui.stickKnob.style.transform = '';
      setStick(null);
    });
  }
}
