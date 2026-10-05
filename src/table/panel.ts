/*
 * The table's own parts of a game's page: the panel under the felt (the timer, the rack of chips, the
 * balance and the buttons) and the list of who's at the table, put into the game's empty
 * `[data-table-panel]` and `[data-table-players]`.
 */

const PANEL = `
    <div class="tb-timer"><span class="tb-timer-bar"></span><span class="tb-timer-text">Connecting…</span></div>
    <div class="tb-rack" aria-label="Chips: drag one onto a spot, or pick one and tap a spot"></div>
    <div class="tb-bar">
      <div class="tb-figures">
        <div><span>Balance</span><b class="tb-balance">–</b></div>
        <div><span>On the table</span><b class="tb-bet">0</b></div>
      </div>
      <div class="tb-buttons">
        <button type="button" class="tb-button" data-do="undo">Undo</button>
        <button type="button" class="tb-button" data-do="clear">Clear</button>
        <button type="button" class="tb-button" data-do="rebet">Rebet</button>
        <button type="button" class="tb-button" data-do="double">2×</button>
        <button type="button" class="tb-deal" data-do="deal" aria-pressed="false"></button>
      </div>
    </div>
    <p class="tb-error" hidden></p>`;

const PLAYERS = `<h2 class="tb-players-title">At the table <span></span></h2><ol class="tb-players-list"></ol>`;

export type TableUi = ReturnType<typeof buildPanel>;

/** Puts the panel and the players' list in, and finds the page's elements. */
export function buildPanel() {
  const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  const panel = document.querySelector('[data-table-panel]') as HTMLElement;
  panel.innerHTML = PANEL;
  const players = document.querySelector('[data-table-players]') as HTMLElement;
  players.innerHTML = PLAYERS;
  const inPanel = <T extends HTMLElement>(selector: string): T => panel.querySelector(selector) as T;
  return {
    felt: $('felt'),
    rack: inPanel('.tb-rack'),
    balance: inPanel('.tb-balance'),
    bet: inPanel('.tb-bet'),
    undo: inPanel<HTMLButtonElement>('[data-do="undo"]'),
    clear: inPanel<HTMLButtonElement>('[data-do="clear"]'),
    rebet: inPanel<HTMLButtonElement>('[data-do="rebet"]'),
    double: inPanel<HTMLButtonElement>('[data-do="double"]'),
    dealVote: inPanel<HTMLButtonElement>('[data-do="deal"]'),
    error: inPanel('.tb-error'),
    timer: inPanel('.tb-timer'),
    timerBar: inPanel('.tb-timer-bar'),
    timerText: inPanel('.tb-timer-text'),
    result: $('result'),
    resultTitle: $('result-title'),
    resultText: $('result-text'),
    tableNo: $('table-no'),
    players: players.querySelector('.tb-players-list') as HTMLElement,
    seatCount: players.querySelector('.tb-players-title span') as HTMLElement,
  };
}
