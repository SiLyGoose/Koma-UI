import '../shared/style.css';
import './codedle.css';
import { barSlot, setConn, soundButton } from '../shared/ui/frame/frame';
import { gameSocket, server, showMessage, token, watching, type GameSocket } from '../shared/game';
import { apiFromSocket, startLive } from '../shared/ui';
import { setMuted } from '../shared/audio';
import { coin } from '../shared/util/coin';
import type { ClientMessage, CodedleEnded, CodedleLive, CodedleMark, CodedleRefusal, CodedleRow, CodedleState, ServerMessage } from '../protocol/codedle';

/*
 * Codedle, as Wordle: the vault is locked with a code of digits, and the first to guess it takes what's inside. It is a
 * random event in Discord (the bot's events/games/codedle.ts); this page plays the same game. The link (from the event's
 * Play on the site, or the front page) carries the player's token (t) and the bot's WebSocket address (s) after the #.
 *
 * Wordle's board, but ours: as many guesses as they'll pay for (each costs its fee, into the vault), so the board grows
 * and scrolls; a row of dials over it with each digit cracked so far, in its place; a keypad of digits, each lit by the
 * best its guesses have shown; and everyone guessing the one code at once, against the clock. Only their own guesses are
 * shown while the vault is locked; once it opens (or time runs out), the code, who cracked it, and everyone's guesses.
 * The bot holds the code and scores every guess: nothing here gives it away.
 */

const ERRORS: Record<string, [string, string]> = {
  bad_token: ['This link has run out', 'Open Codedle again from the games page or from the event in Discord for a new one.'],
  replaced: ['Opened somewhere else', 'Codedle is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
};

/** At least this many rows on the board, as Wordle's six: the empty ones under the guesses. */
const MIN_ROWS = 6;
/** How long a tile takes to turn over, and how far after the one before it each starts (ms: codedle.css's flip). */
const FLIP_MS = 420;
const FLIP_STEP = 140;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  game: document.querySelector('.cd-game') as HTMLElement,
  prize: $('prize'),
  clock: $('clock'),
  clockLabel: $('clock-label'),
  cost: $('cost'),
  crowd: $('crowd'),
  dials: $('dials'),
  boardScroll: $('board-scroll'),
  board: $('board'),
  toast: $('toast'),
  keys: $('keys'),
  idle: $('idle'),
  idleTitle: $('idle-title'),
  idleText: $('idle-text'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultCode: $('result-code'),
  resultText: $('result-text'),
  resultBoard: $('result-board'),
};

const coins = (n: number): string => `${n.toLocaleString('en-US')} zeiucoins`;

/** An amount in a stat of the vault: the number, then :zeiucoin: (the word would crowd it on a phone). */
function amount(into: HTMLElement, n: number): void {
  into.replaceChildren(n.toLocaleString('en-US'), coin('cd-coin'));
}

const state = {
  socket: null as GameSocket<ClientMessage> | null,
  game: null as CodedleState | null,
  /** The digits typed for the next guess. */
  typed: '',
  /** The guess sent, shown in its row until its hint comes (null: none); and the last sent, until the bot answers it. */
  pending: null as { seq: number; guess: string } | null,
  sent: null as { seq: number; guess: string } | null,
  seq: 0,
  /** Which Codedle the board is of (when it closes), and how many of its rows have been turned over already. */
  of: null as number | null,
  shown: 0,
};

// ---- What's drawn ----

/** A tile: a digit (or none), and its hint (none: not guessed yet). */
function tile(digit: string, mark: CodedleMark | null, extra = ''): HTMLElement {
  const box = document.createElement('div');
  box.className = `cd-tile${mark ? ` ${mark}` : ''}${digit ? ' filled' : ''}${extra ? ` ${extra}` : ''}`;
  box.setAttribute('role', 'gridcell');
  box.textContent = digit;
  if (mark) box.setAttribute('aria-label', `${digit}: ${mark === 'hit' ? 'right place' : mark === 'near' ? 'in the code, another place' : 'not in the code'}`);
  return box;
}

/** A row of a guess and its hint; `flip`: turned over now, a tile after another. */
function guessRow(row: CodedleRow, flip: boolean): HTMLElement {
  const line = document.createElement('div');
  line.className = 'cd-row';
  line.setAttribute('role', 'row');
  [...row.guess].forEach((digit, i) => {
    const one = tile(digit, row.marks[i] ?? 'miss', flip ? 'flip' : '');
    if (flip) one.style.setProperty('--delay', `${i * FLIP_STEP}ms`);
    line.append(one);
  });
  if (flip && row.marks.every((mark) => mark === 'hit')) line.classList.add('won');
  return line;
}

/** The row being typed (`pending`: sent, waiting for its hint), or an empty one. */
function typingRow(length: number, digits: string, pending: boolean): HTMLElement {
  const line = document.createElement('div');
  line.className = `cd-row typing${pending ? ' pending' : ''}`;
  line.setAttribute('role', 'row');
  for (let i = 0; i < length; i++) line.append(tile(digits[i] ?? '', null, i === digits.length && !pending ? 'caret' : ''));
  return line;
}

function emptyRow(length: number): HTMLElement {
  const line = document.createElement('div');
  line.className = 'cd-row empty';
  line.setAttribute('role', 'row');
  for (let i = 0; i < length; i++) line.append(tile('', null));
  return line;
}

/** Each digit's best hint so far (a hit over a near over a miss). */
function bestOf(rows: readonly CodedleRow[]): Map<string, CodedleMark> {
  const rank: Record<CodedleMark, number> = { miss: 0, near: 1, hit: 2 };
  const best = new Map<string, CodedleMark>();
  for (const row of rows) {
    [...row.guess].forEach((digit, i) => {
      const mark = row.marks[i] ?? 'miss';
      const was = best.get(digit);
      if (!was || rank[mark] > rank[was]) best.set(digit, mark);
    });
  }
  return best;
}

/**
 * The board's rows: the guesses' (each drawn once, and only added to, so a row turning over is never drawn again
 * mid-turn), then the one being typed and the empty ones (drawn again each time). Each part's rows sit in the board as
 * its own (display: contents).
 */
const guessRows = Object.assign(document.createElement('div'), { className: 'cd-rows' });
const restRows = Object.assign(document.createElement('div'), { className: 'cd-rows' });
ui.board.append(guessRows, restRows);

function renderLive(game: CodedleState, live: CodedleLive): void {
  const { length } = game;
  // Another Codedle than the board was of: its rows as they are, none turned over.
  if (state.of !== live.endsAt) {
    state.of = live.endsAt;
    state.shown = live.mine.length;
    state.typed = '';
    state.pending = null;
    state.sent = null;
    guessRows.replaceChildren(...live.mine.map((row) => guessRow(row, false)));
  }
  amount(ui.prize, live.prize);
  if (live.guessCost > 0) amount(ui.cost, live.guessCost);
  else ui.cost.textContent = 'Free';
  ui.crowd.textContent = live.guesses === 0 ? 'No guesses yet. Be the first to try the lock.' : `${live.guesses.toLocaleString('en-US')} ${live.guesses === 1 ? 'guess' : 'guesses'} by ${live.guessers} ${live.guessers === 1 ? 'player' : 'players'} so far`;

  // The dials: each place's digit, once a guess has it right there.
  ui.dials.replaceChildren();
  for (let i = 0; i < length; i++) {
    const cracked = live.mine.find((row) => row.marks[i] === 'hit')?.guess[i];
    const dial = document.createElement('span');
    dial.className = `cd-dial${cracked ? ' cracked' : ''}`;
    dial.textContent = cracked ?? '?';
    dial.setAttribute('aria-label', cracked ? `Place ${i + 1}: ${cracked}` : `Place ${i + 1}: not cracked yet`);
    ui.dials.append(dial);
  }

  // The board: their guesses (the new ones turned over), the one being typed, then empty rows.
  const fresh = live.mine.length > state.shown;
  for (const row of live.mine.slice(state.shown)) guessRows.append(guessRow(row, true));
  state.shown = live.mine.length;
  const won = live.mine.at(-1)?.marks.every((mark) => mark === 'hit') ?? false;
  restRows.replaceChildren(...(won ? [] : [typingRow(length, state.pending?.guess ?? state.typed, state.pending !== null)]));
  for (let i = guessRows.children.length + restRows.children.length; i < MIN_ROWS; i++) restRows.append(emptyRow(length));
  // (The row being typed in sight: the board scrolls down to it as it grows.)
  if (fresh || guessRows.children.length >= MIN_ROWS) ui.boardScroll.scrollTop = ui.boardScroll.scrollHeight;

  // The keypad: each digit lit by its best hint, once its row has turned over.
  const best = bestOf(live.mine);
  const paint = (): void => {
    for (const key of ui.keys.querySelectorAll<HTMLButtonElement>('[data-key]')) {
      const mark = best.get(key.dataset.key ?? '');
      key.classList.remove('hit', 'near', 'miss');
      if (mark) key.classList.add(mark);
    }
  };
  if (fresh) setTimeout(paint, FLIP_MS + FLIP_STEP * (length - 1));
  else paint();
}

/** The code's tiles: all lit (cracked), or shown plain (the vault stayed locked). */
function codeTiles(code: string, cracked: boolean): HTMLElement[] {
  return [...code].map((digit, i) => {
    const one = tile(digit, cracked ? 'hit' : null, 'flip reveal');
    one.style.setProperty('--delay', `${i * FLIP_STEP}ms`);
    return one;
  });
}

function renderResult(last: CodedleEnded | null): void {
  ui.result.hidden = last === null;
  if (!last) return;
  const cracked = last.winner !== null;
  ui.resultTitle.textContent = last.won ? 'You cracked it!' : cracked ? `${last.winner} cracked it!` : 'The vault stayed locked';
  ui.result.classList.toggle('won', last.won);
  ui.resultCode.replaceChildren(...codeTiles(last.code, cracked));
  const tries = `${last.guesses.toLocaleString('en-US')} ${last.guesses === 1 ? 'guess' : 'guesses'}`;
  ui.resultText.textContent = last.won
    ? `${coins(last.prize)} are yours, after ${tries} in all.`
    : cracked
      ? `${last.winner} took ${coins(last.prize)}, after ${tries} in all.`
      : `Nobody got it in ${tries}. The money stays in the vault for next time.`;
  ui.resultBoard.replaceChildren();
  const older = last.guesses - last.board.length;
  if (older > 0) ui.resultBoard.append(Object.assign(document.createElement('li'), { className: 'cd-result-older', textContent: `…and ${older.toLocaleString('en-US')} older ${older === 1 ? 'guess' : 'guesses'}` }));
  for (const row of last.board) {
    const item = document.createElement('li');
    item.className = `cd-result-row${row.mine ? ' mine' : ''}`;
    const tiles = document.createElement('span');
    tiles.className = 'cd-mini';
    [...row.guess].forEach((digit, i) => tiles.append(tile(digit, row.marks[i] ?? 'miss')));
    const name = document.createElement('span');
    name.className = 'cd-result-name';
    name.textContent = row.mine ? `${row.name ?? 'You'} (you)` : (row.name ?? 'Someone');
    item.append(tiles, name);
    ui.resultBoard.append(item);
  }
}

function render(): void {
  const game = state.game;
  if (!game) return;
  const live = game.live;
  ui.game.classList.toggle('live', live !== null);
  for (const part of [ui.dials, ui.boardScroll, ui.keys]) part.hidden = live === null;
  ui.idle.hidden = live !== null;
  if (live) {
    renderLive(game, live);
    ui.result.hidden = true;
  } else {
    ui.prize.textContent = '–';
    ui.cost.textContent = '–';
    ui.crowd.textContent = '';
    ui.idleText.textContent = game.last
      ? 'No Codedle is going right now. The next one pops up in Discord: keep this page open and it opens here too.'
      : 'No Codedle is going right now. When one pops up in Discord, it opens here too: keep this page open.';
    renderResult(game.last);
  }
  renderClock();
}

/** The time left on the clock (or, with none going, nothing to count). */
function renderClock(): void {
  const live = state.game?.live;
  if (!live) {
    ui.clockLabel.textContent = 'Closes in';
    ui.clock.textContent = '–';
    return;
  }
  const left = Math.max(0, Math.ceil((live.endsAt - Date.now()) / 1000));
  ui.clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  ui.clock.classList.toggle('late', left <= 30);
  ui.clockLabel.textContent = left > 0 ? 'Closes in' : 'Closing…';
}

let toastTimer = 0;
/** Says `text` over the board for a moment. */
function toast(text: string, good = false): void {
  ui.toast.textContent = text;
  ui.toast.classList.toggle('good', good);
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (ui.toast.hidden = true), good ? 3200 : 2000);
}

/** The row being typed shakes: that won't do. */
function shake(): void {
  const row = ui.board.querySelector('.cd-row.typing');
  if (!row) return;
  row.classList.remove('shake');
  void (row as HTMLElement).offsetWidth;
  row.classList.add('shake');
}

// ---- Typing and guessing ----

function press(key: string): void {
  const live = state.game?.live;
  if (!live || state.pending) return;
  const length = state.game?.length ?? 0;
  if (/^\d$/.test(key)) {
    if (state.typed.length >= length) return;
    state.typed += key;
  } else if (key === 'Backspace') {
    state.typed = state.typed.slice(0, -1);
  } else if (key === 'Enter') {
    if (state.typed.length < length) {
      toast(`Not enough digits: a code has ${length}.`);
      return shake();
    }
    if (Date.now() >= live.endsAt) return toast('Too late: the vault is closing.');
    const seq = ++state.seq;
    if (!state.socket?.send({ t: 'guess', guess: state.typed, seq })) return toast('Not connected right now. Try again in a moment.');
    state.pending = state.sent = { seq, guess: state.typed };
    state.typed = '';
  } else return;
  render();
}

const REFUSED: Record<CodedleRefusal, (length: number, cost: number) => string> = {
  bad_guess: (length) => `A guess is ${length} digits.`,
  over: () => 'Too late: the vault just closed.',
  cant_afford: (_, cost) => `A guess costs ${coins(cost)}, and you don't have enough.`,
  failed: () => "Something went wrong: that guess wasn't counted (or charged). Try again.",
};

function answered(message: Extract<ServerMessage, { t: 'answer' }>): void {
  if (state.sent?.seq !== message.seq) return;
  const sent = state.sent.guess;
  state.sent = null;
  if (state.pending?.seq === message.seq) state.pending = null;
  if (message.ok) {
    if (message.won) toast('You cracked it! The vault is yours.', true);
    render();
    return;
  }
  // Not taken: back in the row to change, shaking.
  if (state.typed === '') state.typed = sent;
  render();
  shake();
  toast(REFUSED[message.reason](state.game?.length ?? 0, state.game?.live?.guessCost ?? 0));
}

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      state.socket?.finish();
      const [title, text] = ERRORS[message.code] ?? (ERRORS.bad_message as [string, string]);
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'state': {
      const wasLive = state.game?.live ?? null;
      state.game = message.state;
      // (Its hint came with the game: the row it was typed in is the guess's now.)
      if (state.pending && message.state.live?.mine.at(-1)?.guess === state.pending.guess && message.state.live.mine.length > state.shown) state.pending = null;
      // The vault just opened for someone else, or the clock ran out, while they were here.
      if (wasLive && !message.state.live && message.state.last && !message.state.last.won) toast(message.state.last.winner ? `${message.state.last.winner} cracked it.` : "Time's up: the vault stayed locked.");
      render();
      return;
    }
    case 'answer':
      answered(message);
      return;
  }
}

soundButton('codedle-muted', setMuted);
for (const key of ui.keys.querySelectorAll<HTMLButtonElement>('[data-key]')) key.addEventListener('click', () => press(key.dataset.key ?? ''));
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]')) return;
  const key = /^Numpad\d$/.test(event.code) ? event.code.slice(-1) : event.key === 'NumpadEnter' ? 'Enter' : event.key;
  if (!/^\d$/.test(key) && key !== 'Backspace' && key !== 'Enter') return;
  event.preventDefault();
  press(key);
});
setInterval(renderClock, 250);

if (watching) {
  setConn('Not watchable', 'bad');
  showMessage("Codedle isn't watched", 'Everyone in the server guesses the same code: open Codedle from the games page to join in.');
} else if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', "Log in on the games page and pick Codedle, or press Play on the site on a Codedle in Discord.");
} else {
  const link = token;
  state.socket = gameSocket<ServerMessage, ClientMessage>({ server, hello: () => ({ t: 'hello', token: link }), receive });
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: true });
}
