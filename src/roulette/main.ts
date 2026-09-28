import { avatarImg, chipEl, chipLabel, points, sleep, stackChips, startTable, type Pile } from '../table/table';
import './roulette.css';
import type { Color, Pocket, RouletteRoundView, RoundView, Spot } from './protocol';

/*
 * Roulette in the browser, at a shared table (../table/table.ts does the table: the chips, the
 * players, the countdown and the bot). This is the felt: the wheel, spun when the round is dealt,
 * and the board the chips go on.
 *
 * The board is laid out like a casino's: 0 and 00, then 1 to 36 in twelve rows of three (across on a
 * computer, the rows as columns; down on a phone), the 2 to 1 columns at the end, the dozens and the
 * even-money bets along the side. Between the numbers are the inside bets: a chip on the line
 * between two numbers is a split, on a corner of four a corner, and on the edge of a row a street (or
 * where two rows meet, a line). Every bet's spot is named as the bot names it (see protocol.ts).
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  board: $('board'),
  wheel: $('wheel'),
  number: $('wheel-number'),
  recent: $('recent'),
};

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorOf = (n: Pocket): Color => (n === 0 || n === '00' ? 'green' : RED.has(n) ? 'red' : 'black');
const COLOR_NAME: Record<Color, string> = { red: 'Red', black: 'Black', green: 'Green' };
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// ---------------------------------------------------------------------------
// The board

/** Every spot, and the numbers it covers (to light them up while a chip hovers over it). */
const spots = new Map<Spot, HTMLElement>();
const covers = new Map<Spot, Pocket[]>();
const cells = new Map<Pocket, HTMLElement>();

function spotButton(spot: Spot, numbers: Pocket[], className: string, label: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `rl-spot ${className}`;
  el.dataset.spot = spot;
  el.setAttribute('aria-label', label);
  const marker = document.createElement('span');
  marker.className = 'rl-marker';
  el.append(marker);
  spots.set(spot, el);
  covers.set(spot, numbers);
  el.addEventListener('pointerenter', () => light(numbers, true));
  el.addEventListener('pointerleave', () => light(numbers, false));
  return el;
}

function light(numbers: Pocket[], on: boolean): void {
  for (const n of numbers) cells.get(n)?.classList.toggle('lit', on);
}

/**
 * Where a spot goes, as [column, row] grid lines: `h` on a computer (the numbers across), `v` on a
 * phone (down). The numbers' rows (across) or columns (down) are split in halves, so 0 and 00 can
 * each take a row and a half beside them.
 */
function place(el: HTMLElement, h: [string, string], v: [string, string]): void {
  el.style.setProperty('--hc', h[0]);
  el.style.setProperty('--hr', h[1]);
  el.style.setProperty('--vc', v[0]);
  el.style.setProperty('--vr', v[1]);
}

/** Across the board: which row of three a number is in (0 to 11), and how far down it is on a computer (0 is the top: 3, 6, 9...). */
const streetOf = (n: number): number => Math.ceil(n / 3) - 1;
const rowOf = (n: number): number => 2 - ((n - 1) % 3);

function buildBoard(): void {
  // 0 by 1 and 2, 00 by 2 and 3.
  for (const [pocket, h, v] of [
    [0, '4 / 7', '3 / 6'],
    ['00', '1 / 4', '6 / 9'],
  ] as const) {
    const zero = spotButton(String(pocket), [pocket], 'rl-number green', String(pocket));
    zero.append(String(pocket));
    place(zero, ['1', h], [v, '1']);
    cells.set(pocket, zero);
    ui.board.append(zero);
  }

  for (let n = 1; n <= 36; n++) {
    const cell = spotButton(String(n), [n], `rl-number ${colorOf(n)}`, `${n} ${COLOR_NAME[colorOf(n)]}`);
    cell.append(String(n));
    place(cell, [String(streetOf(n) + 2), `${rowOf(n) * 2 + 1} / span 2`], [`${((n - 1) % 3) * 2 + 3} / span 2`, String(streetOf(n) + 2)]);
    cells.set(n, cell);
    ui.board.append(cell);
  }

  for (let k = 1; k <= 3; k++) {
    const numbers = range(1, 36).filter((n) => (n - k) % 3 === 0);
    const column = spotButton(`column${k}`, numbers, 'rl-outside rl-column', `Column ${k}, 2 to 1`);
    column.append('2:1');
    place(column, ['14', `${(3 - k) * 2 + 1} / span 2`], [`${(k - 1) * 2 + 3} / span 2`, '14']);
    ui.board.append(column);
  }

  const dozens = ['1st 12', '2nd 12', '3rd 12'];
  for (let d = 1; d <= 3; d++) {
    const dozen = spotButton(`dozen${d}`, range(d * 12 - 11, d * 12), 'rl-outside rl-dozen', `${dozens[d - 1]}, 2 to 1`);
    dozen.append(dozens[d - 1] as string);
    const from = 2 + (d - 1) * 4;
    place(dozen, [`${from} / span 4`, '7'], ['2', `${from} / span 4`]);
    ui.board.append(dozen);
  }

  const even: [Spot, string, number[]][] = [
    ['low', '1-18', range(1, 18)],
    ['even', 'Even', range(1, 36).filter((n) => n % 2 === 0)],
    ['red', '', range(1, 36).filter((n) => colorOf(n) === 'red')],
    ['black', '', range(1, 36).filter((n) => colorOf(n) === 'black')],
    ['odd', 'Odd', range(1, 36).filter((n) => n % 2 === 1)],
    ['high', '19-36', range(19, 36)],
  ];
  even.forEach(([spot, text, numbers], i) => {
    const el = spotButton(spot, numbers, `rl-outside rl-even rl-${spot}`, `${text || COLOR_NAME[spot as Color]}, 1 to 1`);
    if (text) el.append(text);
    else {
      const diamond = document.createElement('i');
      diamond.className = 'rl-diamond';
      el.append(diamond);
    }
    const from = 2 + i * 2;
    place(el, [`${from} / span 2`, '8'], ['1', `${from} / span 2`]);
    ui.board.append(el);
  });

  // The inside bets between the numbers, on a layer over them. Each is put at (x, y): x across the
  // twelve rows (0 to 12), y down the three numbers of a row (0 to 3, from the top on a computer).
  const inside = document.createElement('div');
  inside.className = 'rl-inside';
  const zone = (numbers: Pocket[], x: number, y: number, kind: string): void => {
    const el = spotButton(numbers.join('-'), numbers, `rl-zone rl-${kind}`, `${kind[0]?.toUpperCase()}${kind.slice(1)} ${numbers.join(', ')}`);
    el.style.setProperty('--x', String(x));
    el.style.setProperty('--y', String(y));
    inside.append(el);
  };
  for (let n = 1; n <= 36; n++) {
    const x = streetOf(n);
    const y = rowOf(n);
    const inRow = (n - 1) % 3;
    if (inRow < 2) zone([n, n + 1], x + 0.5, y, 'split');
    if (n <= 33) zone([n, n + 3], x + 1, y + 0.5, 'split');
    if (inRow < 2 && n <= 32) zone([n, n + 1, n + 3, n + 4], x + 1, y, 'corner');
    if (inRow === 0) zone([n, n + 1, n + 2], x + 0.5, 3, 'street');
    if (inRow === 0 && n <= 31) zone(range(n, n + 5), x + 1, 3, 'line');
  }
  // The zeros: 0 takes the bottom row and a half (y 1.5 to 3), 00 the top (0 to 1.5).
  zone([0, '00'], -0.5, 1.5, 'split');
  zone([0, 1], 0, 2.5, 'split');
  zone(['00', 3], 0, 0.5, 'split');
  zone([0, 1, 2], 0, 2, 'street');
  zone([0, '00', 2], 0, 1.5, 'street');
  zone(['00', 2, 3], 0, 1, 'street');
  zone([0, '00', 1, 2, 3], 0, 3, 'top line');
  ui.board.append(inside);
}

/**
 * The chips on a spot: one chip (this page's, with how much) and the pictures of whoever else has
 * chips there. The spots are small, so everyone's chips are one marker, like at a real table.
 */
function renderSpot(el: HTMLElement, piles: Pile[], chips: readonly number[]): void {
  const marker = el.querySelector('.rl-marker') as HTMLElement;
  marker.textContent = '';
  marker.className = 'rl-marker';
  if (piles.length === 0) return;
  const mine = piles.find((p) => p.mine);
  const others = piles.filter((p) => !p.mine);
  const total = piles.reduce((sum, p) => sum + p.amount, 0);
  const amount = mine?.amount ?? total;
  const chip = chipEl(stackChips(amount, chips).at(-1) ?? chips[0] ?? 1);
  chip.textContent = chipLabel(amount);
  chip.classList.toggle('theirs', !mine);
  marker.append(chip);
  for (const pile of others.slice(0, 3)) marker.append(avatarImg(pile.seat, 'rl-marker-avatar'));
  if (others.length > 3) {
    const more = document.createElement('span');
    more.className = 'rl-marker-more';
    more.textContent = `+${others.length - 3}`;
    marker.append(more);
  }
  const outcome = mine?.outcome ?? others.find((p) => p.outcome === 'win')?.outcome ?? others[0]?.outcome;
  if (outcome) marker.classList.add(outcome);
  if (mine?.refused) marker.classList.add('refused');
  marker.title = piles.map((p) => `${p.mine ? 'You' : p.seat.name}: ${points(p.amount)}`).join('\n');
}

// ---------------------------------------------------------------------------
// The wheel

/** The pockets round an American wheel, clockwise from 0. */
const WHEEL: Pocket[] = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
const STEP = 360 / WHEEL.length;
/** How long a spin takes, and the pause before how it went shows. */
const SPIN_MS = 6500;
const RESULT_MS = 500;

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

function buildWheel(): void {
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
function turnTo(n: Pocket, ms: number): void {
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

function showNumber(n: Pocket | null): void {
  ui.number.textContent = n === null ? '' : String(n);
  ui.number.className = `rl-wheel-number${n === null ? '' : ` show ${colorOf(n)}`}`;
}

function showRecent(numbers: Pocket[]): void {
  ui.recent.textContent = '';
  for (const n of numbers) {
    const pill = document.createElement('span');
    pill.className = `rl-recent-no ${colorOf(n)}`;
    pill.textContent = String(n);
    ui.recent.append(pill);
  }
}

function hit(round: RouletteRoundView, on: boolean): void {
  for (const [spot, numbers] of covers) {
    if (numbers.length === 1 || numbers.length >= 12) spots.get(spot)?.classList.toggle('hit', on && numbers.includes(round.number));
  }
}

// ---------------------------------------------------------------------------

buildBoard();
buildWheel();

startTable<Spot, RouletteRoundView>({
  name: 'roulette',
  title: 'Roulette',
  key: 'roulette',
  words: {
    button: 'Spin',
    verb: 'spin',
    doing: 'Spinning…',
    soon: 'spinning in',
    alone: 'Spin the wheel now',
    together: 'the wheel is spun once everyone has voted',
  },
  spots,
  renderSpot,

  clear() {
    for (const el of spots.values()) el.classList.remove('hit');
    showNumber(null);
  },

  show(round: RoundView) {
    turnTo(round.number, 0);
    showNumber(round.number);
    showRecent(round.recent);
  },

  async animate(round: RoundView, current: () => boolean) {
    showRecent(round.recent.slice(1));
    turnTo(round.number, SPIN_MS);
    await sleep(SPIN_MS + RESULT_MS);
    if (!current()) return;
    showNumber(round.number);
    showRecent(round.recent);
  },

  reveal(round: RoundView) {
    hit(round, true);
  },

  describe(round: RoundView) {
    const n = round.number;
    const words = [`${n} ${COLOR_NAME[round.color]}`];
    if (typeof n === 'number' && n > 0) words.push(n % 2 ? 'Odd' : 'Even', n <= 18 ? '1-18' : '19-36');
    return words.join(' · ');
  },
});
