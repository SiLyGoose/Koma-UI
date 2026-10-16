import type { RouletteColor, RoulettePocket } from '../protocol/roulette';

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = (n: RoulettePocket): RouletteColor => (n === 0 || n === '00' ? 'green' : RED.has(n) ? 'red' : 'black');
export const COLOR_NAME: Record<RouletteColor, string> = { red: 'Red', black: 'Black', green: 'Green' };
