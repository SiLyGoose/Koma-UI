/** The mine's elements (games/mines/index.html), found once. */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export const ui = {
  panel: $<HTMLFormElement>('panel'),
  balance: $('balance'),
  bet: $<HTMLInputElement>('bet'),
  betRange: $('bet-range'),
  mines: $<HTMLSelectElement>('mines'),
  action: $<HTMLButtonElement>('action'),
  random: $<HTMLButtonElement>('random'),
  mult: $('mult'),
  nextLabel: $('next-label'),
  next: $('next'),
  gems: $('gems'),
  maxPayout: $('max-payout'),
  error: $('error'),
  idle: $('idle'),
  board: $('board'),
  result: $('result'),
  resultMult: $('result-mult'),
  resultText: $('result-text'),
};
