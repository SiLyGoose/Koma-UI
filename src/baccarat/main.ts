import '../style.css';
import { barSlot, setConn, soundButton } from '../frame';
import { apiFromSocket, showWatchers, showWatching, startLive, watchAway, watchBack } from '../live';
import './baccarat.css';
import type { Bets, Card, ClientMessage, DealRefusal, ErrorCode, RoundView, ServerMessage, Spot, Table } from './protocol';

/*
 * Baccarat in the browser. The link from Discord (or the front page) carries, after the #, the
 * player's token (t) and the bot's WebSocket address (s). Chips are dragged from the rack onto the
 * spots (or a chip is picked and the spots tapped); Deal sends them to the bot, which takes them,
 * deals the round and pays at once. This page then deals the cards out one by one and shows how
 * each bet did. The chips stay on the table for the next round until they're changed.
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
  deal: $<HTMLButtonElement>('deal'),
  error: $('error'),
  verdict: $('verdict'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
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
const chipLabel = (n: number): string => (n >= 1000 ? `${n / 1000}K` : String(n));

/** The bot's currency, :zeiucoin:, to go after an amount. */
function coin(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = 'zeiucoin';
  img.className = 'coin';
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

let table: Table | null = null;
/** The chips on each spot, and the order they went down (for Undo). */
let bets: Bets = {};
let history: { spot: Spot; amount: number }[] = [];
/** The chips of the round dealt last, for Rebet after a Clear. */
let lastBets: Bets | null = null;
/** The chip picked in the rack (tapping a spot puts one of these on it). */
let selected = 0;
/** A deal sent and not answered, or a round being dealt out. */
let pending: number | null = null;
let dealingOut = false;
/** The round on the table (its cards stay until the next deal). */
let shown: RoundView | null = null;
let balance: number | null = null;

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

const onTable = (b: Bets = bets): number => SPOTS.reduce((sum, spot) => sum + (b[spot] ?? 0), 0);
const busy = (): boolean => watching || pending !== null || dealingOut || !table;

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
  const chips = [...(table?.chips ?? [1])].sort((a, b) => b - a);
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

function renderStacks(outcomes?: RoundView['bets']): void {
  for (const [spot, el] of spotEls) {
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
    const outcome = outcomes?.find((b) => b.spot === spot)?.outcome;
    el.classList.toggle('won', outcome === 'win');
    el.classList.toggle('lost', outcome === 'lose');
    el.classList.toggle('push', outcome === 'push');
    el.classList.toggle('has-chips', amount > 0);
  }
}

function renderBar(): void {
  ui.balance.textContent = balance === null ? '–' : points(balance);
  ui.bet.textContent = points(onTable());
  const idle = busy();
  ui.undo.disabled = idle || history.length === 0;
  ui.clear.disabled = idle || onTable() === 0;
  ui.rebet.disabled = idle || !lastBets || onTable() > 0;
  ui.double.disabled = idle || onTable() === 0 || !fits(onTable() * 2);
  ui.deal.disabled = idle || onTable() === 0;
  ui.deal.textContent = watching ? (watched ? `Watching ${watched}` : 'Watching') : pending !== null || dealingOut ? 'Dealing…' : 'Deal';
  for (const chip of ui.rack.querySelectorAll<HTMLElement>('.bc-chip')) {
    chip.classList.toggle('picked', Number(chip.dataset.value) === selected);
    chip.classList.toggle('off', idle || !fits(onTable() + Number(chip.dataset.value)));
  }
  for (const [spot, el] of spotEls) {
    el.disabled = watching;
    const odds = el.querySelector<HTMLElement>(`[data-odds="${spot}"]`);
    if (odds && table) odds.textContent = `${table.payouts[spot]}:1`;
  }
}

/** Whether a round of `total` could be dealt: within the table's limit and what they have. */
function fits(total: number): boolean {
  if (!table) return false;
  return total <= table.maxBet && (balance === null || total <= balance);
}

/** Why a chip can't go down, or null if it can. */
function whyNot(total: number): string | null {
  if (!table) return 'Connecting…';
  if (total > table.maxBet) return `The most on the table is ${points(table.maxBet)} a round.`;
  if (balance !== null && total > balance) return `You only have ${points(balance)}.`;
  return null;
}

/** Starts a new round of betting when the last one's cards are still out. */
function clearRound(): void {
  if (!shown) return;
  shown = null;
  for (const side of ['player', 'banker'] as const) {
    ui.cards[side].textContent = '';
    ui.totals[side].textContent = '';
    ui.hands[side].classList.remove('winner');
  }
  ui.verdict.textContent = '';
  ui.verdict.className = 'bc-vs';
  ui.result.hidden = true;
  renderStacks();
}

function place(spot: Spot, amount: number): void {
  if (busy() || amount <= 0) return;
  clearRound();
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
  renderStacks();
  renderBar();
  const stack = spotEls.get(spot)?.querySelector('.bc-stack');
  stack?.lastElementChild?.previousElementSibling?.classList.add('drop');
}

/** Takes every chip off `spot` (back to the rack). */
function takeBack(spot: Spot, sound = true): void {
  if (busy() || !(bets[spot] ?? 0)) return;
  clearRound();
  const { [spot]: _, ...rest } = bets;
  bets = rest;
  history = history.filter((h) => h.spot !== spot);
  if (sound) tone('move');
  showError(null);
  renderStacks();
  renderBar();
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
  for (const value of table?.chips ?? []) {
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
  pick(table?.chips.includes(kept) ? kept : (table?.chips[2] ?? table?.chips[0] ?? 0), false);
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
 * rack: onto a spot puts it there. From a spot (its whole stack): onto another spot moves it, off the
 * table takes it back. A press that hardly moves is a tap: it picks the chip (or bets the picked one).
 */
function startDrag(e: PointerEvent, from: DragFrom): void {
  if (busy() || e.button !== 0) return;
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
    // Dragging a stack off a spot; a tap bets the picked chip (see startDrag).
    if (bets[spot]) startDrag(e, { from: 'spot', spot });
  });
  el.addEventListener('click', (e) => {
    // Taps on an empty spot (a spot with chips handles its own, in startDrag), and keyboard presses.
    if (bets[spot] && e.detail !== 0) return;
    place(spot, selected);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    takeBack(spot);
  });
}

ui.undo.addEventListener('click', () => {
  const last = history.pop();
  if (!last || busy()) return;
  clearRound();
  const left = (bets[last.spot] ?? 0) - last.amount;
  bets = { ...bets, [last.spot]: left };
  if (left <= 0) delete bets[last.spot];
  tone('move');
  showError(null);
  renderStacks();
  renderBar();
});

ui.clear.addEventListener('click', () => {
  if (busy()) return;
  clearRound();
  if (onTable() > 0) tone('move');
  bets = {};
  history = [];
  showError(null);
  renderStacks();
  renderBar();
});

ui.rebet.addEventListener('click', () => {
  if (busy() || !lastBets) return;
  for (const spot of SPOTS) if (lastBets[spot]) place(spot, lastBets[spot] as number);
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

/** Deals `round` out on the table, card by card, then shows how it went. */
async function dealOut(round: RoundView): Promise<void> {
  dealingOut = true;
  shown = null;
  clearRoundCards();
  renderBar();
  const dealt = { player: [] as Card[], banker: [] as Card[] };
  for (const side of round.order) {
    await sleep(CARD_MS);
    const card = round[side][dealt[side].length] as Card;
    dealt[side].push(card);
    const el = cardEl(card, dealt[side].length === 3);
    ui.cards[side].append(el);
    requestAnimationFrame(() => el.classList.add('flip'));
    tone('card');
    if (dealt[side].length >= 2 || dealt[side].length === 1) ui.totals[side].textContent = String(handTotal(dealt[side]));
  }
  await sleep(RESULT_MS);
  shown = round;
  showOutcome(round);
  dealingOut = false;
  renderBar();
}

function clearRoundCards(): void {
  for (const side of ['player', 'banker'] as const) {
    ui.cards[side].textContent = '';
    ui.totals[side].textContent = '';
    ui.hands[side].classList.remove('winner');
  }
  ui.verdict.textContent = '';
  ui.verdict.className = 'bc-vs';
  ui.result.hidden = true;
  renderStacks();
}

function showOutcome(round: RoundView): void {
  const { winner } = round;
  if (winner !== 'tie') ui.hands[winner].classList.add('winner');
  ui.verdict.textContent = winner === 'tie' ? 'TIE' : `${SPOT_NAME[winner].toUpperCase()} WINS`;
  ui.verdict.className = `bc-vs show ${winner}`;
  renderStacks(round.bets);

  const notes: string[] = [];
  if (round.natural) notes.push(`Natural ${Math.max(round.playerTotal, round.bankerTotal)}`);
  if (round.bets.some((b) => b.spot === 'kirin' && b.outcome === 'win') || (winner === 'player' && round.player.length === 3 && round.playerTotal === 8)) notes.push('🦄 Kirin');
  if (round.bets.some((b) => b.spot === 'phoenix' && b.outcome === 'win') || (winner === 'banker' && round.banker.length === 3 && round.bankerTotal === 7)) notes.push('🐦‍🔥 Phoenix');

  ui.result.classList.toggle('lost', round.net < 0);
  ui.result.classList.toggle('even', round.net === 0);
  ui.resultTitle.textContent = round.net > 0 ? `+${points(round.net)}` : round.net < 0 ? `−${points(-round.net)}` : '±0';
  ui.resultTitle.append(' ', coin());
  ui.resultText.textContent = [`${round.playerTotal} to ${round.bankerTotal}`, ...notes].join(' · ');
  ui.result.hidden = false;
  balance = round.balance;
  tone(round.net > 0 ? 'win' : round.net < 0 ? 'lose' : 'chip');
}

// ---------------------------------------------------------------------------
// Talking to the bot

let socket: WebSocket | null = null;
let seq = 0;
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

function deal(): void {
  if (busy() || onTable() === 0) return;
  const problem = whyNot(onTable());
  if (problem) return showError(problem);
  seq += 1;
  if (!send({ t: 'deal', bets, seq })) return;
  pending = seq;
  showError(null);
  renderBar();
}

function refusalText(r: DealRefusal): string {
  switch (r.reason) {
    case 'too_small':
      return `The least on the table is ${points(r.limit)}.`;
    case 'too_big':
      return `The most on the table is ${points(r.limit)} a round.`;
    case 'too_poor':
      return `You only have ${points(r.balance)}.`;
    case 'busy':
      return 'Hold on, the last round is still being dealt.';
  }
}

function receive(message: ServerMessage): void {
  switch (message.t) {
    case 'error': {
      finished = true;
      const [title, text] = ERRORS[message.code] ?? ERRORS.bad_message;
      showMessage(title, text);
      setConn('Disconnected', 'bad');
      return;
    }
    case 'table': {
      const first = table === null;
      table = message.table;
      balance = message.table.balance;
      if (first) {
        buildRack();
        lastBets = message.table.lastBets;
      }
      renderStacks();
      renderBar();
      return;
    }
    case 'refused':
      if (pending === message.seq) pending = null;
      if (message.reason === 'too_poor') balance = message.balance;
      showError(refusalText(message));
      renderBar();
      return;
    case 'watching':
      watched = message.player;
      showWatching(watched);
      renderBar();
      return;
    case 'watchers':
      showWatchers(message.count);
      return;
    case 'away':
      showWatching(watched, true);
      watchAway(
        () => showMessage(`${watched} left the game`, `${watched} isn't playing baccarat any more. Head back home to see who's online and watch someone else.`),
        () => (ui.message.hidden = true),
      );
      return;
    case 'round': {
      if (watching) {
        if (watched) {
          showWatching(watched);
          watchBack();
        }
        // Their chips, as they bet them.
        bets = Object.fromEntries(message.round.bets.map((b) => [b.spot, b.amount]));
        if (!table) table = { player: watched, balance: 0, minBet: 1, maxBet: 0, chips: [1, 5, 25, 100, 500, 1000, 5000], payouts: { player: 1, banker: 0.95, tie: 8, kirin: 25, phoenix: 40 }, lastBets: null };
      } else if (pending !== message.seq) {
        return;
      }
      pending = null;
      lastBets = { ...bets };
      void dealOut(message.round);
    }
  }
}

function connect(): void {
  if (!token || !server) return;
  setConn(retries === 0 ? 'Connecting…' : 'Reconnecting…', '');
  const ws = new WebSocket(server);
  socket = ws;
  ws.addEventListener('open', () => {
    retries = 0;
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
    pending = null;
    renderBar();
    const wait = Math.min(RETRY_MAX_MS, 500 * 2 ** retries++);
    setConn('Reconnecting…', 'bad');
    setTimeout(connect, wait);
  });
}

// ---------------------------------------------------------------------------
// Input

ui.deal.addEventListener('click', deal);
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const onButton = document.activeElement instanceof HTMLButtonElement || document.activeElement?.getAttribute('role') === 'button';
  if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
    e.preventDefault();
    deal();
  }
});

// ---------------------------------------------------------------------------
// Start

renderStacks();
renderBar();
if (!token || !server) {
  setConn('No link', 'bad');
  showMessage('Open this from the games page', 'Log in on the games page and pick Baccarat, or use the baccarat command in Discord.');
} else {
  connect();
  startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
}
