import '../style.css';
import { barSlot, setConn, soundButton } from '../frame';
import { apiFromSocket, showWatchers, showWatching, startLive, watchAway, watchBack } from '../live';
import './baccarat.css';
import type { BetRefusal, Bets, Card, ClientMessage, ErrorCode, RoundView, SeatView, ServerMessage, Spot, TableState } from './protocol';

/*
 * Baccarat in the browser, at a shared table. The link from Discord (or the front page) carries,
 * after the #, the player's token (t) and the bot's WebSocket address (s); the bot seats them at a
 * table with up to four others.
 *
 * Each round has a betting time (the bar under the table counts it down). Chips are dragged from
 * the rack onto the spots (or a chip is picked and the spots tapped), and every change is sent to
 * the bot, which shows it to the whole table: the other players' chips are on the spots by their
 * profile pictures, and the list on the right says who is at the table, their balance, and what
 * they have down. When the time is up the bot deals one round for everyone; this page deals the
 * cards out one by one and shows how each player did. Then the next round's betting starts.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  felt: $('felt'),
  rack: $('rack'),
  balance: $('balance'),
  bet: $('bet'),
  undo: $<HTMLButtonElement>('undo'),
  clear: $<HTMLButtonElement>('clear'),
  rebet: $<HTMLButtonElement>('rebet'),
  double: $<HTMLButtonElement>('double'),
  error: $('error'),
  verdict: $('verdict'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
  timer: $('timer'),
  timerBar: $('timer-bar'),
  timerText: $('timer-text'),
  tableNo: $('table-no'),
  players: $('players'),
  seatCount: $('seat-count'),
  message: $('message'),
  messageTitle: $('message-title'),
  messageText: $('message-text'),
  cards: { player: $('cards-player'), banker: $('cards-banker') },
  totals: { player: $('total-player'), banker: $('total-banker') },
  hands: { player: $('hand-player'), banker: $('hand-banker') },
};

const SPOTS: readonly Spot[] = ['player', 'banker', 'tie', 'kirin', 'phoenix'];
const SPOT_NAME: Record<Spot, string> = { player: 'Player', banker: 'Banker', tie: 'Tie', kirin: 'Kirin', phoenix: 'Phoenix' };
const spotEls = new Map<Spot, HTMLButtonElement>(
  [...document.querySelectorAll<HTMLButtonElement>('[data-spot]')].map((el) => [el.dataset.spot as Spot, el]),
);

/** How long between cards as a round is dealt out, and before the result shows. */
const CARD_MS = 520;
const RESULT_MS = 450;

const points = (n: number): string => n.toLocaleString('en-US');
const signedPoints = (n: number): string => (n > 0 ? `+${points(n)}` : n < 0 ? `−${points(-n)}` : '±0');
const chipLabel = (n: number): string => (n >= 1000 ? `${n / 1000}K` : String(n));
const sumBets = (b: Bets): number => SPOTS.reduce((sum, spot) => sum + (b[spot] ?? 0), 0);

/** The bot's currency, :zeiucoin:, to go after an amount. */
function coin(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = 'zeiucoin';
  img.className = 'coin';
  return img;
}

function avatarImg(seat: SeatView, className: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = className;
  img.src = seat.avatar;
  img.alt = '';
  img.title = seat.name;
  img.referrerPolicy = 'no-referrer';
  img.draggable = false;
  return img;
}

// ---------------------------------------------------------------------------
// The link

const params = new URLSearchParams(location.hash.slice(1));
/** A link to play has t=, a link to watch someone play has w= (watch-only: nothing here can be pressed). */
const watchToken = params.get('w');
const watching = watchToken !== null;
const token = params.get('t') ?? watchToken;
const server = params.get('s');
let watched = '';

function showMessage(title: string, text: string): void {
  ui.messageTitle.textContent = title;
  ui.messageText.textContent = text;
  ui.message.hidden = false;
}

// ---------------------------------------------------------------------------
// Sounds: a card placed, a chip put on a spot, and chips slid off a spot (taken back or cleared)
// (public/baccarat/sfx), and, made here, a chip's click (picking one) and a chime for a win.

let muted = false;
soundButton('baccarat-muted', (on) => (muted = on));
let audio: AudioContext | null = null;

const SOUNDS = {
  card: new Audio(`${import.meta.env.BASE_URL}baccarat/sfx/place-card.mp3`),
  place: new Audio(`${import.meta.env.BASE_URL}baccarat/sfx/place-poker-chip.mp3`),
  move: new Audio(`${import.meta.env.BASE_URL}baccarat/sfx/move-poker-chip.mp3`),
};
for (const sound of Object.values(SOUNDS)) sound.preload = 'auto';

function tone(kind: 'chip' | 'place' | 'move' | 'card' | 'win' | 'lose'): void {
  if (muted) return;
  if (kind === 'card' || kind === 'place' || kind === 'move') {
    // A copy each time, so sounds close together don't cut each other off.
    const copy = SOUNDS[kind].cloneNode() as HTMLAudioElement;
    copy.play().catch(() => {
      // Sound blocked or missing: play on without it.
    });
    return;
  }
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    const gain = audio.createGain();
    gain.connect(audio.destination);
    const notes = kind === 'chip' ? [2600] : kind === 'win' ? [660, 880, 1320] : [300, 220];
    notes.forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const g = audio!.createGain();
      osc.type = kind === 'chip' ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const start = now + i * (kind === 'chip' ? 0 : 0.09);
      const length = kind === 'chip' ? 0.05 : 0.18;
      g.gain.setValueAtTime(kind === 'chip' ? 0.18 : 0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + length);
      osc.connect(g).connect(gain);
      osc.start(start);
      osc.stop(start + length);
    });
  } catch {
    // No sound here: play on without it.
  }
}

// ---------------------------------------------------------------------------
// What is on the table

/** The table as the bot last said. */
let state: TableState | null = null;
/** This page's chips: what the bot last confirmed, changed straight away as chips go down (and sent). */
let bets: Bets = {};
let history: { spot: Spot; amount: number }[] = [];
/** The chip picked in the rack (tapping a spot puts one of these on it). */
let selected = 0;
/** When the phase ends, on this page's clock. */
let deadline = 0;
/** The round whose cards are on the table (its number), and whether they are still being dealt out. */
let shownRound = 0;
let dealingOut = false;
let rackBuilt = false;

const SELECTED_KEY = 'baccarat.chip';
function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // No storage (a private window): not kept.
  }
}

const mySeat = (): SeatView | undefined => state?.seats.find((s) => s.userId === state?.you);
const onTable = (b: Bets = bets): number => sumBets(b);
const balance = (): number | null => mySeat()?.balance ?? null;
/** Chips can't be touched: watching, not seated yet, or the round isn't taking bets. */
const busy = (): boolean => watching || !state || !mySeat() || state.phase !== 'betting';

function showError(text: string | null): void {
  ui.error.hidden = text === null;
  ui.error.textContent = text ?? '';
}

/** A chip, as the rack and the stacks draw it: its colour by its value. */
function chipEl(value: number): HTMLElement {
  const el = document.createElement('span');
  el.className = `bc-chip bc-chip-${value}`;
  el.dataset.value = String(value);
  el.textContent = chipLabel(value);
  return el;
}

/** `amount` as a stack of chips: as few as make it up (the biggest first), at most 6 drawn. */
function stackChips(amount: number): number[] {
  const chips = [...(state?.chips ?? [1])].sort((a, b) => b - a);
  const out: number[] = [];
  let left = amount;
  for (const chip of chips) {
    while (left >= chip && out.length < 40) {
      out.push(chip);
      left -= chip;
    }
  }
  return out.reverse().slice(-6);
}

/** How each of this page's bets did in the round shown (once its cards are all out). */
function myOutcomes(): Map<Spot, 'win' | 'push' | 'lose'> {
  const result = !dealingOut && state?.phase === 'dealing' ? mySeat()?.result : null;
  return new Map((result?.bets ?? []).map((b) => [b.spot, b.outcome]));
}

function renderSpots(): void {
  const outcomes = myOutcomes();
  const others = state?.seats.filter((s) => s.userId !== state?.you) ?? [];
  const showingResults = !dealingOut && state?.phase === 'dealing';
  for (const [spot, el] of spotEls) {
    // This page's chips: a stack, with the amount beside it.
    const amount = bets[spot] ?? 0;
    const stack = el.querySelector('.bc-stack') as HTMLElement;
    stack.textContent = '';
    if (amount > 0) {
      stackChips(amount).forEach((value, i) => {
        const chip = chipEl(value);
        chip.style.setProperty('--i', String(i));
        stack.append(chip);
      });
      const label = document.createElement('span');
      label.className = 'bc-stack-amount';
      label.textContent = points(amount);
      stack.append(label);
    }
    // Everyone else's: their picture and how much.
    const row = el.querySelector('.bc-others') as HTMLElement;
    row.textContent = '';
    for (const seat of others) {
      const theirs = seat.bets[spot] ?? 0;
      if (theirs <= 0) continue;
      const pill = document.createElement('span');
      pill.className = 'bc-other';
      const outcome = showingResults ? seat.result?.bets.find((b) => b.spot === spot)?.outcome : undefined;
      if (outcome) pill.classList.add(outcome);
      if (seat.refused) pill.classList.add('refused');
      pill.append(avatarImg(seat, 'bc-other-avatar'), chipLabelText(theirs));
      pill.title = `${seat.name}: ${points(theirs)}`;
      row.append(pill);
    }
    // On a computer, everyone's chips as stacks instead, side by side in seat order (so a player's
    // pile is in the same place on every spot), each with its owner's picture and amount under it.
    const piles = el.querySelector('.bc-piles') as HTMLElement;
    piles.textContent = '';
    for (const seat of state?.seats ?? []) {
      const mine = seat.userId === state?.you;
      const theirs = mine ? amount : (seat.bets[spot] ?? 0);
      if (theirs <= 0) continue;
      const pile = document.createElement('span');
      pile.className = 'bc-pile';
      if (mine) pile.classList.add('mine');
      const outcome = showingResults ? seat.result?.bets.find((b) => b.spot === spot)?.outcome : undefined;
      if (outcome) pile.classList.add(outcome);
      if (showingResults && seat.refused) pile.classList.add('refused');
      pile.title = `${mine ? 'You' : seat.name}: ${points(theirs)}`;
      const chips = document.createElement('span');
      chips.className = 'bc-pile-chips';
      const values = stackChips(theirs);
      values.forEach((value, i) => {
        const chip = chipEl(value);
        chip.style.setProperty('--i', String(i));
        chips.append(chip);
      });
      chips.style.setProperty('--n', String(values.length));
      const tag = document.createElement('span');
      tag.className = 'bc-pile-tag';
      tag.append(avatarImg(seat, 'bc-pile-avatar'), chipLabelText(theirs));
      pile.append(chips, tag);
      piles.append(pile);
    }
    // A busy spot (up to 8 players at a table) gets smaller piles, so they still fit side by side.
    piles.classList.toggle('crowded', piles.childElementCount > 4);
    const outcome = outcomes.get(spot);
    el.classList.toggle('won', outcome === 'win');
    el.classList.toggle('lost', outcome === 'lose');
    el.classList.toggle('push', outcome === 'push');
    el.classList.toggle('has-chips', amount > 0);
  }
}

function chipLabelText(amount: number): HTMLElement {
  const b = document.createElement('b');
  b.textContent = amount >= 10_000 ? chipLabel(amount) : points(amount);
  return b;
}

function renderPlayers(): void {
  ui.players.textContent = '';
  if (!state) return;
  ui.tableNo.textContent = `· Table ${state.table}`;
  ui.seatCount.textContent = `${state.seats.length}/${state.maxSeats}`;
  const showingResults = !dealingOut && state.phase === 'dealing';
  for (const seat of state.seats) {
    const li = document.createElement('li');
    li.className = 'bc-seat';
    if (seat.userId === state.you) li.classList.add('you');
    // The name is cut short if it's long, but the "you" tag after it always shows.
    const name = document.createElement('div');
    name.className = 'bc-seat-name';
    const nameText = document.createElement('span');
    nameText.textContent = seat.name;
    name.append(nameText);
    if (seat.userId === state.you) {
      const tag = document.createElement('span');
      tag.className = 'bc-you';
      tag.textContent = watching ? 'watching' : 'you';
      name.append(tag);
    }
    const money = document.createElement('div');
    money.className = 'bc-seat-balance';
    money.append(points(seat.balance), coin());
    const status = document.createElement('div');
    status.className = 'bc-seat-status';
    const down = sumBets(seat.userId === state.you ? bets : seat.bets);
    if (showingResults && seat.result) {
      status.textContent = signedPoints(seat.result.net);
      status.classList.add(seat.result.net > 0 ? 'won' : seat.result.net < 0 ? 'lost' : 'even');
    } else if (showingResults && seat.refused) {
      status.textContent = 'Couldn’t cover the bet';
      status.classList.add('lost');
    } else if (down > 0) {
      status.textContent = `${points(down)} down`;
      status.classList.add('down');
    } else {
      status.textContent = state.phase === 'betting' ? 'Placing chips…' : 'Sat out';
    }
    const text = document.createElement('div');
    text.className = 'bc-seat-text';
    text.append(name, money);
    li.append(avatarImg(seat, 'bc-seat-avatar'), text, status);
    ui.players.append(li);
  }
  for (let i = state.seats.length; i < state.maxSeats; i++) {
    const li = document.createElement('li');
    li.className = 'bc-seat empty';
    li.textContent = 'Empty seat';
    ui.players.append(li);
  }
}

function renderBar(): void {
  const have = balance();
  ui.balance.textContent = have === null ? '–' : points(have);
  ui.bet.textContent = points(onTable());
  const idle = busy();
  const last = mySeat()?.lastBets ?? null;
  ui.undo.disabled = idle || history.length === 0;
  ui.clear.disabled = idle || onTable() === 0;
  ui.rebet.disabled = idle || !last || onTable() > 0 || !fits(sumBets(last));
  ui.double.disabled = idle || onTable() === 0 || !fits(onTable() * 2);
  for (const chip of ui.rack.querySelectorAll<HTMLElement>('.bc-chip')) {
    chip.classList.toggle('picked', Number(chip.dataset.value) === selected);
    chip.classList.toggle('off', idle || !fits(onTable() + Number(chip.dataset.value)));
  }
  for (const [spot, el] of spotEls) {
    el.disabled = watching;
    const odds = el.querySelector<HTMLElement>(`[data-odds="${spot}"]`);
    if (odds && state) odds.textContent = `${state.payouts[spot]}:1`;
  }
}

function render(): void {
  renderSpots();
  renderPlayers();
  renderBar();
  renderTimer();
}

/** The countdown under the table: how long the betting has left, or that the round is being dealt. */
function renderTimer(): void {
  if (!state) return;
  const left = Math.max(0, deadline - performance.now());
  const betting = state.phase === 'betting';
  const whole = betting ? bettingWhole : 1;
  ui.timer.classList.toggle('dealing', !betting);
  ui.timer.classList.toggle('soon', betting && left < 10_000);
  ui.timerBar.style.transform = `scaleX(${betting ? Math.min(1, left / whole) : 0})`;
  const seconds = Math.ceil(left / 1000);
  ui.timerText.textContent = betting
    ? seconds > 0
      ? `Place your bets · dealing in ${seconds}s`
      : 'Dealing…'
    : dealingOut
      ? 'Dealing…'
      : `Next round in ${seconds}s`;
}

/** The betting time as a whole, for the bar: the most time left seen in this betting phase. */
let bettingWhole = 60_000;

/** Whether this page's chips could come to `total`: within the table's limit and their balance. */
function fits(total: number): boolean {
  if (!state) return false;
  const have = balance();
  return total <= state.maxBet && (have === null || total <= have);
}

/** Why a chip can't go down, or null if it can. */
function whyNot(total: number): string | null {
  if (!state) return 'Connecting…';
  if (state.phase !== 'betting') return 'Wait for the next round to bet.';
  if (total > state.maxBet) return `The most on the table is ${points(state.maxBet)} a round.`;
  const have = balance();
  if (have !== null && total > have) return `You only have ${points(have)}.`;
  return null;
}

/** Sends this page's chips to the bot (which shows them to the table). */
let seq = 0;
function sendBets(): void {
  seq += 1;
  send({ t: 'bets', bets, seq });
}

function place(spot: Spot, amount: number): void {
  if (amount <= 0) return;
  if (busy()) {
    if (!watching && state?.phase === 'dealing') showError('Wait for the next round to bet.');
    return;
  }
  const problem = whyNot(onTable() + amount);
  if (problem) {
    showError(problem);
    shake(spotEls.get(spot));
    return;
  }
  showError(null);
  bets = { ...bets, [spot]: (bets[spot] ?? 0) + amount };
  history.push({ spot, amount });
  tone('place');
  sendBets();
  render();
  const stack = spotEls.get(spot)?.querySelector('.bc-stack');
  stack?.lastElementChild?.previousElementSibling?.classList.add('drop');
}

/** Takes every chip of this page's off `spot` (back to the rack). */
function takeBack(spot: Spot, sound = true): void {
  if (busy() || !(bets[spot] ?? 0)) return;
  const { [spot]: _, ...rest } = bets;
  bets = rest;
  history = history.filter((h) => h.spot !== spot);
  if (sound) tone('move');
  showError(null);
  sendBets();
  render();
}

function shake(el: HTMLElement | null | undefined): void {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// ---------------------------------------------------------------------------
// The rack, and dragging chips

function buildRack(): void {
  ui.rack.textContent = '';
  for (const value of state?.chips ?? []) {
    const chip = chipEl(value);
    chip.tabIndex = 0;
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-label', `${points(value)} chip`);
    chip.addEventListener('pointerdown', (e) => startDrag(e, { from: 'rack', value }));
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(value);
      }
    });
    ui.rack.append(chip);
  }
  const kept = Number(remembered(SELECTED_KEY));
  pick(state?.chips.includes(kept) ? kept : (state?.chips[2] ?? state?.chips[0] ?? 0), false);
}

function pick(value: number, sound = true): void {
  selected = value;
  remember(SELECTED_KEY, String(value));
  if (sound) tone('chip');
  renderBar();
}

type DragFrom = { from: 'rack'; value: number } | { from: 'spot'; spot: Spot };

/**
 * A chip picked up: a copy follows the pointer, and where it's let go decides what happens. From the
 * rack: onto a spot puts it there. From a spot (this page's whole stack): onto another spot moves it,
 * off the table takes it back. A press that hardly moves is a tap: it picks the chip (or bets the picked one).
 */
function startDrag(e: PointerEvent, from: DragFrom): void {
  if (watching || e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);

  const spotAt = (x: number, y: number): HTMLButtonElement | null => {
    const el = document.elementFromPoint(x, y);
    return el?.closest<HTMLButtonElement>('[data-spot]') ?? null;
  };

  const move = (ev: PointerEvent): void => {
    if (busy()) return;
    if (!ghost && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
    if (!ghost) {
      const value = from.from === 'rack' ? from.value : (bets[from.spot] ?? 0);
      ghost = from.from === 'rack' ? chipEl(value) : chipEl(stackChips(value).at(-1) ?? value);
      if (from.from === 'spot') ghost.textContent = chipLabel(value);
      ghost.classList.add('bc-ghost');
      document.body.append(ghost);
      if (from.from === 'spot') spotEls.get(from.spot)?.classList.add('lifting');
    }
    ghost.style.left = `${ev.clientX}px`;
    ghost.style.top = `${ev.clientY}px`;
    const spot = spotAt(ev.clientX, ev.clientY);
    if (spot !== over) {
      over?.classList.remove('over');
      over = spot;
      over?.classList.add('over');
    }
  };

  const up = (ev: PointerEvent): void => {
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', up);
    over?.classList.remove('over');
    if (from.from === 'spot') spotEls.get(from.spot)?.classList.remove('lifting');
    const dropped = ghost ? spotAt(ev.clientX, ev.clientY) : null;
    ghost?.remove();
    const to = dropped?.dataset.spot as Spot | undefined;
    if (!ghost) {
      // A tap.
      if (from.from === 'rack') pick(from.value);
      else place(from.spot, selected);
      return;
    }
    if (ev.type === 'pointercancel') return;
    if (from.from === 'rack') {
      if (to) place(to, from.value);
      return;
    }
    const amount = bets[from.spot] ?? 0;
    if (to === from.spot) return;
    // Moved to another spot: just the place sound, not a take-back and a place.
    takeBack(from.spot, !to);
    if (to) place(to, amount);
  };

  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
}

for (const [spot, el] of spotEls) {
  el.addEventListener('pointerdown', (e) => {
    // Dragging this page's stack off a spot; a tap bets the picked chip (see startDrag).
    if (bets[spot]) startDrag(e, { from: 'spot', spot });
  });
  el.addEventListener('click', (e) => {
    // Taps on a spot without this page's chips (one with them handles its own, in startDrag), and keyboard presses.
    if (bets[spot] && e.detail !== 0) return;
    place(spot, selected);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    takeBack(spot);
  });
}

ui.undo.addEventListener('click', () => {
  if (busy()) return;
  const last = history.pop();
  if (!last) return;
  const left = (bets[last.spot] ?? 0) - last.amount;
  bets = { ...bets, [last.spot]: left };
  if (left <= 0) delete bets[last.spot];
  tone('move');
  showError(null);
  sendBets();
  render();
});

ui.clear.addEventListener('click', () => {
  if (busy() || onTable() === 0) return;
  tone('move');
  bets = {};
  history = [];
  showError(null);
  sendBets();
  render();
});

ui.rebet.addEventListener('click', () => {
  const last = mySeat()?.lastBets;
  if (busy() || !last) return;
  for (const spot of SPOTS) if (last[spot]) place(spot, last[spot] as number);
});

ui.double.addEventListener('click', () => {
  if (busy()) return;
  const problem = whyNot(onTable() * 2);
  if (problem) return showError(problem);
  for (const spot of SPOTS) if (bets[spot]) place(spot, bets[spot] as number);
});

// ---------------------------------------------------------------------------
// Dealing

const SUIT: Record<Card['suit'], string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const rankLabel = (rank: number): string => (rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank));
const cardPoints = (card: Card): number => (card.rank >= 10 ? 0 : card.rank);
const handTotal = (cards: Card[]): number => cards.reduce((sum, card) => sum + cardPoints(card), 0) % 10;

function cardEl(card: Card, third: boolean): HTMLElement {
  const el = document.createElement('div');
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  el.className = `bc-card${red ? ' red' : ''}${third ? ' third' : ''}`;
  const face = document.createElement('div');
  face.className = 'bc-card-face';
  const corner = document.createElement('span');
  corner.className = 'bc-card-corner';
  corner.textContent = `${rankLabel(card.rank)}${SUIT[card.suit]}`;
  const middle = document.createElement('span');
  middle.className = 'bc-card-suit';
  middle.textContent = SUIT[card.suit];
  const back = document.createElement('div');
  back.className = 'bc-card-back';
  face.append(corner, middle);
  el.append(face, back);
  el.setAttribute('aria-label', `${rankLabel(card.rank)} of ${card.suit}`);
  return el;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function clearCards(): void {
  for (const side of ['player', 'banker'] as const) {
    ui.cards[side].textContent = '';
    ui.totals[side].textContent = '';
    ui.hands[side].classList.remove('winner');
  }
  ui.verdict.textContent = '';
  ui.verdict.className = 'bc-vs';
  ui.result.hidden = true;
  ui.felt.classList.remove('last-round');
}

/**
 * Counts up to cancel a round being dealt out: a page in a background tab has its timers slowed,
 * so the next round's betting can start before the cards are all out.
 */
let dealing = 0;

/** Shows a round's cards at once, faded (the last round, while the next one takes bets). */
function showCards(round: RoundView): void {
  dealing += 1;
  dealingOut = false;
  clearCards();
  for (const side of ['player', 'banker'] as const) {
    round[side].forEach((card, i) => {
      const el = cardEl(card, i === 2);
      el.classList.add('flip');
      ui.cards[side].append(el);
    });
    ui.totals[side].textContent = String(handTotal(round[side]));
  }
  if (round.winner !== 'tie') ui.hands[round.winner].classList.add('winner');
  ui.felt.classList.add('last-round');
}

/** Deals `round` out on the table, card by card, then shows how it went. */
async function dealOut(round: RoundView): Promise<void> {
  const mine = ++dealing;
  dealingOut = true;
  shownRound = round.no;
  clearCards();
  render();
  const dealt = { player: [] as Card[], banker: [] as Card[] };
  for (const side of round.order) {
    await sleep(CARD_MS);
    if (mine !== dealing) return;
    const card = round[side][dealt[side].length] as Card;
    dealt[side].push(card);
    const el = cardEl(card, dealt[side].length === 3);
    ui.cards[side].append(el);
    requestAnimationFrame(() => el.classList.add('flip'));
    tone('card');
    ui.totals[side].textContent = String(handTotal(dealt[side]));
  }
  await sleep(RESULT_MS);
  if (mine !== dealing) return;
  dealingOut = false;
  showOutcome(round);
  render();
}

function showOutcome(round: RoundView): void {
  const { winner } = round;
  if (winner !== 'tie') ui.hands[winner].classList.add('winner');
  ui.verdict.textContent = winner === 'tie' ? 'TIE' : `${SPOT_NAME[winner].toUpperCase()} WINS`;
  ui.verdict.className = `bc-vs show ${winner}`;

  const notes: string[] = [];
  if (round.natural) notes.push(`Natural ${Math.max(round.playerTotal, round.bankerTotal)}`);
  if (winner === 'player' && round.player.length === 3 && round.playerTotal === 8) notes.push('🦄 Kirin');
  if (winner === 'banker' && round.banker.length === 3 && round.bankerTotal === 7) notes.push('🐦‍🔥 Phoenix');
  const text = [`${round.playerTotal} to ${round.bankerTotal}`, ...notes].join(' · ');

  const me = mySeat();
  const net = me?.result?.net ?? null;
  if (net === null) {
    // No chips down (or refused): just how the round went.
    ui.result.classList.remove('lost', 'even');
    ui.result.classList.add('even');
    ui.resultTitle.textContent = me?.refused ? 'Bet refused' : 'Sat out';
    ui.resultText.textContent = text;
  } else {
    ui.result.classList.toggle('lost', net < 0);
    ui.result.classList.toggle('even', net === 0);
    ui.resultTitle.textContent = signedPoints(net);
    ui.resultTitle.append(' ', coin());
    ui.resultText.textContent = text;
    tone(net > 0 ? 'win' : net < 0 ? 'lose' : 'chip');
  }
  ui.result.hidden = false;
}

// ---------------------------------------------------------------------------
// Talking to the bot

let socket: WebSocket | null = null;
let finished = false;
let retries = 0;
const RETRY_MAX_MS = 5000;

const ERRORS: Record<ErrorCode, [string, string]> = {
  bad_token: ['This link has run out', 'Open baccarat again from the games page or from Discord for a new one.'],
  replaced: ['Opened somewhere else', 'Baccarat is open in another tab or window. Only one can play at a time.'],
  bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
  not_playing: ['Nobody to watch', "They aren't playing baccarat right now. Pick someone else from the online list."],
  full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
};

function send(message: ClientMessage): boolean {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function refusalText(r: BetRefusal): string {
  switch (r.reason) {
    case 'too_big':
      return `The most on the table is ${points(r.limit)} a round.`;
    case 'too_poor':
      return `You only have ${points(r.balance)}.`;
    case 'closed':
      return 'Too late: the round is being dealt.';
  }
}

/** The table as the bot says it is now. */
function showState(next: TableState): void {
  const before = state;
  state = next;
  deadline = performance.now() + next.msLeft;
  if (next.phase === 'betting' && (before?.phase !== 'betting' || next.msLeft > bettingWhole)) bettingWhole = Math.max(next.msLeft, 1);
  if (!rackBuilt) {
    buildRack();
    rackBuilt = true;
  }

  // While betting, this page's chips are what the player put down (the bot is sent each change); the
  // bot's word on them is taken when a change was refused, when watching, and outside the betting.
  const me = mySeat();
  if (me && (watching || next.phase !== 'betting' || before?.phase !== 'betting' || adoptBets)) bets = { ...me.bets };
  adoptBets = false;
  if (next.phase === 'betting' && before?.phase !== 'betting') {
    history = [];
    showError(null);
  }

  // A new round dealt: deal it out. Joining (or back) mid-round, or betting after one: its cards, faded.
  if (next.phase === 'dealing' && next.round && next.round.no !== shownRound) {
    if (before === null || before.phase === 'dealing') {
      shownRound = next.round.no;
      showCards(next.round);
      showOutcome(next.round);
      render();
    } else {
      void dealOut(next.round);
    }
    return;
  }
  if (next.phase === 'betting' && next.round && shownRound !== next.round.no) {
    shownRound = next.round.no;
    showCards(next.round);
  } else if (next.phase === 'betting' && before?.phase === 'dealing' && next.round) {
    showCards(next.round);
  }
  render();
}

/** A change of chips was refused: the table that follows has the chips that are really down. */
let adoptBets = false;

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      finished = true;
      const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'table':
      showState(message.state);
      break;
    case 'refused':
      showError(refusalText(message));
      adoptBets = true;
      history = [];
      return;
    case 'watching':
      watched = message.player;
      showWatching(watched);
      render();
      return;
    case 'watchers':
      showWatchers(message.count);
      return;
    case 'away':
      showWatching(watched, true);
      watchAway(
        () => showMessage(`${watched} left the table`, `${watched} isn't playing baccarat any more. Head back home to see who's online and watch someone else.`),
        () => (ui.message.hidden = true),
      );
      return;
  }
  if (watching && watched) {
    showWatching(watched);
    watchBack();
  }
}

function connect(): void {
  if (!token || !server) return;
  setConn(retries === 0 ? 'Connecting…' : 'Reconnecting…', '');
  const ws = new WebSocket(server);
  socket = ws;
  ws.addEventListener('open', () => {
    retries = 0;
    seq = 0;
    adoptBets = true;
    setConn('Connected', 'ok');
    send(watching ? { t: 'watch', token } : { t: 'hello', token });
  });
  ws.addEventListener('message', (e) => {
    try {
      receive(JSON.parse(String(e.data)) as ServerMessage);
    } catch (err) {
      console.error('Could not read a message from the bot:', err);
    }
  });
  ws.addEventListener('close', () => {
    if (socket === ws) socket = null;
    if (finished) return;
    // Dropped (a network blip, the bot restarting): keep trying, waiting longer each time.
    const wait = Math.min(RETRY_MAX_MS, 500 * 2 ** retries++);
    setConn('Reconnecting…', 'bad');
    setTimeout(connect, wait);
  });
}

// ---------------------------------------------------------------------------
// Start

setInterval(renderTimer, 200);
render();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Baccarat, or use the baccarat command in Discord.');
} else {
  connect();
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
}
