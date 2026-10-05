import { colorOf } from './colors';
import type { Pocket } from './protocol';

const ui = {
  wheel: document.getElementById('wheel') as HTMLElement,
  number: document.getElementById('wheel-number') as HTMLElement,
  recent: document.getElementById('recent') as HTMLElement,
};

/** The pockets round an American wheel, clockwise from 0. */
const WHEEL: Pocket[] = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
const STEP = 360 / WHEEL.length;
/** How long a spin takes, and the pause before how it went shows. */
export const SPIN_MS = 6500;
export const RESULT_MS = 500;

const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
const at = (deg: number, r: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

let rotor: SVGGElement;
let ballTrack: SVGGElement;
let wheelTurn = 0;
let ballTurn = 0;

export function buildWheel(): void {
  const root = svg('svg', { viewBox: '-100 -100 200 200', class: 'rl-wheel-svg', 'aria-hidden': 'true' });
  root.append(svg('circle', { r: 99, class: 'rl-rim' }));
  rotor = svg('g', { class: 'rl-rotor' });
  WHEEL.forEach((n, i) => {
    const [x1, y1] = at((i - 0.5) * STEP, 90);
    const [x2, y2] = at((i + 0.5) * STEP, 90);
    const [x3, y3] = at((i + 0.5) * STEP, 60);
    const [x4, y4] = at((i - 0.5) * STEP, 60);
    rotor.append(svg('path', { d: `M${x1} ${y1} A90 90 0 0 1 ${x2} ${y2} L${x3} ${y3} A60 60 0 0 0 ${x4} ${y4}Z`, class: `rl-pocket ${colorOf(n)}` }));
    const [tx, ty] = at(i * STEP, 80);
    const label = svg('text', { x: tx, y: ty, class: 'rl-pocket-no', transform: `rotate(${i * STEP} ${tx} ${ty})` });
    label.textContent = String(n);
    rotor.append(label);
  });
  rotor.append(svg('circle', { r: 58, class: 'rl-cone' }), svg('circle', { r: 18, class: 'rl-hub' }));
  for (let i = 0; i < 4; i++) {
    const [x, y] = at(i * 90 + 45, 44);
    rotor.append(svg('line', { x1: 0, y1: 0, x2: x, y2: y, class: 'rl-spoke' }));
  }
  ballTrack = svg('g', { class: 'rl-ball-track' });
  ballTrack.append(svg('circle', { cx: 0, cy: -66, r: 5, class: 'rl-ball' }));
  root.append(rotor, ballTrack, svg('path', { d: 'M-6 -100 L6 -100 L0 -90Z', class: 'rl-pointer' }));
  ui.wheel.prepend(root);
}

/** Turns the wheel so `n`'s pocket is at the top, under the ball: over `ms` (spinning a few times first), or at once. */
export function turnTo(n: Pocket, ms: number): void {
  const target = -WHEEL.indexOf(n) * STEP;
  const moving = ms > 0;
  if (moving) {
    // Clockwise, at least four turns more; the ball the other way.
    wheelTurn = Math.ceil((wheelTurn + 4 * 360 - target) / 360) * 360 + target;
    ballTurn = Math.floor(ballTurn / 360) * 360 - 5 * 360;
  } else {
    wheelTurn = target;
    ballTurn = 0;
  }
  for (const [el, turn] of [
    [rotor, wheelTurn],
    [ballTrack, ballTurn],
  ] as const) {
    el.style.transition = moving ? `transform ${ms}ms cubic-bezier(0.15, 0.55, 0.2, 1)` : 'none';
    el.style.transform = `rotate(${turn}deg)`;
  }
}

export function showNumber(n: Pocket | null): void {
  ui.number.textContent = n === null ? '' : String(n);
  ui.number.className = `rl-wheel-number${n === null ? '' : ` show ${colorOf(n)}`}`;
}

export function showRecent(numbers: Pocket[]): void {
  ui.recent.textContent = '';
  for (const n of numbers) {
    const pill = document.createElement('span');
    pill.className = `rl-recent-no ${colorOf(n)}`;
    pill.textContent = String(n);
    ui.recent.append(pill);
  }
}
