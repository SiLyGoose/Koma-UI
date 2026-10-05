import { colorOf, COLOR_NAME } from './colors';
import type { Color, Pocket, RouletteRoundView, Spot } from './protocol';

/*
 * The board is laid out like a casino's: 0 and 00, then 1 to 36 in twelve rows of three (across on a
 * computer, the rows as columns; down on a phone), the 2 to 1 columns at the end, the dozens and the
 * even-money bets along the side. Between the numbers are the inside bets: a chip on the line
 * between two numbers is a split, on a corner of four a corner, and on the edge of a row a street (or
 * where two rows meet, a line). Every bet's spot is named as the bot names it (see protocol.ts).
 */

const board = document.getElementById('board') as HTMLElement;
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Every spot, and the numbers it covers (to light them up while a chip hovers over it). */
export const spots = new Map<Spot, HTMLElement>();
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

export function buildBoard(): void {
  // 0 by 1 and 2, 00 by 2 and 3.
  for (const [pocket, h, v] of [
    [0, '4 / 7', '3 / 6'],
    ['00', '1 / 4', '6 / 9'],
  ] as const) {
    const zero = spotButton(String(pocket), [pocket], 'rl-number green', String(pocket));
    zero.append(String(pocket));
    place(zero, ['1', h], [v, '1']);
    cells.set(pocket, zero);
    board.append(zero);
  }

  for (let n = 1; n <= 36; n++) {
    const cell = spotButton(String(n), [n], `rl-number ${colorOf(n)}`, `${n} ${COLOR_NAME[colorOf(n)]}`);
    cell.append(String(n));
    place(cell, [String(streetOf(n) + 2), `${rowOf(n) * 2 + 1} / span 2`], [`${((n - 1) % 3) * 2 + 3} / span 2`, String(streetOf(n) + 2)]);
    cells.set(n, cell);
    board.append(cell);
  }

  for (let k = 1; k <= 3; k++) {
    const numbers = range(1, 36).filter((n) => (n - k) % 3 === 0);
    const column = spotButton(`column${k}`, numbers, 'rl-outside rl-column', `Column ${k}, 2 to 1`);
    column.append('2:1');
    place(column, ['14', `${(3 - k) * 2 + 1} / span 2`], [`${(k - 1) * 2 + 3} / span 2`, '14']);
    board.append(column);
  }

  const dozens = ['1st 12', '2nd 12', '3rd 12'];
  for (let d = 1; d <= 3; d++) {
    const dozen = spotButton(`dozen${d}`, range(d * 12 - 11, d * 12), 'rl-outside rl-dozen', `${dozens[d - 1]}, 2 to 1`);
    dozen.append(dozens[d - 1] as string);
    const from = 2 + (d - 1) * 4;
    place(dozen, [`${from} / span 4`, '7'], ['2', `${from} / span 4`]);
    board.append(dozen);
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
    board.append(el);
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
  board.append(inside);
}

/** Marks the spots that won with `round` (the numbers and the outside bets; the inside bets are too small to show it). */
export function hit(round: RouletteRoundView, on: boolean): void {
  for (const [spot, numbers] of covers) {
    if (numbers.length === 1 || numbers.length >= 12) spots.get(spot)?.classList.toggle('hit', on && numbers.includes(round.number));
  }
}
