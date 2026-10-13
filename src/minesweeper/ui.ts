/** Minesweeper's elements (games/minesweeper/index.html), found once. */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export const ui = {
  levels: [...document.querySelectorAll<HTMLButtonElement>('[data-level]')],
  newGame: $<HTMLButtonElement>('new'),
  time: $('time'),
  minesLeft: $('mines-left'),
  players: $('players'),
  playerCount: $('player-count'),
  ended: $<HTMLButtonElement>('ended'),
  endedTitle: $('ended-title'),
  endedText: $('ended-text'),
  field: $('field'),
  board: $('board'),
  cursors: $('cursors'),
};
