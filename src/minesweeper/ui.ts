/** Minesweeper's elements (games/minesweeper/index.html), found once. */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export const ui = {
  levels: [...document.querySelectorAll<HTMLButtonElement>('[data-level]')],
  newGame: $<HTMLButtonElement>('new'),
  time: $('time'),
  minesLeft: $('mines-left'),
  side: document.querySelector('.ms-players') as HTMLElement,
  players: $('players'),
  playerCount: $('player-count'),
  ended: $<HTMLButtonElement>('ended'),
  endedTitle: $('ended-title'),
  endedText: $('ended-text'),
  endedPaid: $('ended-paid'),
  field: $('field'),
  board: $('board'),
  cursors: $('cursors'),
  bestOpen: $<HTMLButtonElement>('best-open'),
  best: $('best'),
  bestClose: $<HTMLButtonElement>('best-close'),
  bestTabs: [...document.querySelectorAll<HTMLButtonElement>('[data-best]')],
  bestList: $('best-list'),
};
