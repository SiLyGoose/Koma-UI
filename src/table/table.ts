import '../style.css';
import './table.css';
import { barSlot, setConn, soundButton } from '../frame';
import { setMuted } from '../sfx';
import { apiFromSocket, showWatchers, showWatching, startLive, watchAway, watchBack } from '../live';
import { play } from './sfx';
import type { BetRefusal, Bets, ClientMessage, ErrorCode, Outcome, RoundOf, SeatView, ServerMessage, TableState } from './protocol';

/*
 * A shared-table game in the browser (baccarat, roulette): everything but the game's own felt. The
 * link from Discord (or the front page) carries, after the #, the player's token (t) and the bot's
 * WebSocket address (s); the bot seats them at a table with others.
 *
 * Each round has a betting time (the bar under the table counts it down). Chips are dragged from
 * the rack onto the spots (or a chip is picked and the spots tapped), and every change is sent to
 * the bot, which shows it to the whole table: the other players' chips are on the spots by their
 * profile pictures, and the list beside the table says who is at it, their balance, and what they
 * have down. When the time is up the bot deals one round for everyone; the game shows it (dealing
 * the cards out, spinning the wheel) and then how each player did. Then the next round's betting
 * starts.
 *
 * A game's page has, in its HTML: `#felt` with its spots (elements with `data-spot`) and `#result`
 * (with `#result-title` and `#result-text`) on it, an empty `[data-table-panel]` and
 * `[data-table-players]` (filled in here), `#table-no` in its title and the `#message` box. The rest
 * is its TableGame.
 */

/** One player's chips on a spot, as a game draws them. */
export interface Pile<S extends string = string> {
  seat: SeatView<S>;
  amount: number;
  /** This page's (the one being watched, when watching). */
  mine: boolean;
  /** How it came out, once the round is all shown. */
  outcome?: Outcome;
  /** Their chips couldn't be taken when the round was dealt. */
  refused: boolean;
}

export interface TableGame<S extends string, R, X = unknown> {
  /** Its name in a sentence ("baccarat") and as a title ("Baccarat"). */
  name: string;
  title: string;
  /** What its settings in the browser are kept under (the sound switch, the chip picked). */
  key: string;
  /** How dealing is put: the button ("Deal"), in a sentence ("deal"), while it happens ("Dealing…"), before ("dealing in"), and what the button does alone and with others. */
  words: { button: string; verb: string; doing: string; soon: string; alone: string; together: string };
  /** The spots, by name: elements with `data-spot`. */
  spots: ReadonlyMap<S, HTMLElement>;
  /** Draws everyone's chips on a spot (renderPiles when left out). */
  renderSpot?: (el: HTMLElement, piles: Pile<S>[], chips: readonly number[]) => void;
  /** Takes the last round off the felt. */
  clear(): void;
  /** Puts `round` on the felt at once (joining mid-round, or the last round while the next takes bets). */
  show(round: RoundOf<R>): void;
  /** Plays `round` out on the felt (deals the cards, spins the wheel). Stops when `current` turns false. */
  animate(round: RoundOf<R>, current: () => boolean): Promise<void>;
  /** Shows who won `round`, once it's all out. */
  reveal(round: RoundOf<R>): void;
  /** How `round` went, in a few words, like "8 to 6 · Natural 8". */
  describe(round: RoundOf<R>): string;
  /** Anything else of the game's to draw when the table changes (like what each spot pays). */
  render?(state: TableState<S, R, X>): void;
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export const points = (n: number): string => n.toLocaleString('en-US');
export const signedPoints = (n: number): string => (n > 0 ? `+${points(n)}` : n < 0 ? `−${points(-n)}` : '±0');
export const chipLabel = (n: number): string => (n >= 1000 ? `${n / 1000}K` : String(n));
export const sumBets = (b: Bets): number => Object.values<number | undefined>(b).reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The bot's currency, :zeiucoin:, to go after an amount. */
export function coin(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}shared/zeiucoin.png`;
  img.alt = 'zeiucoin';
  img.className = 'coin';
  return img;
}

export function avatarImg(seat: SeatView, className: string): HTMLImageElement {
  const img = document.createElement('img');
  img.className = className;
  img.src = seat.avatar;
  img.alt = '';
  img.title = seat.name;
  img.referrerPolicy = 'no-referrer';
  img.draggable = false;
  return img;
}

/** A chip, as the rack and the stacks draw it: its colour by its value. */
export function chipEl(value: number): HTMLElement {
  const el = document.createElement('span');
  el.className = `tb-chip tb-chip-${value}`;
  el.dataset.value = String(value);
  el.textContent = chipLabel(value);
  return el;
}

/** `amount` as a stack of `chips`: as few as make it up (the biggest first), at most 6 drawn. */
export function stackChips(amount: number, chips: readonly number[]): number[] {
  const sorted = [...(chips.length ? chips : [1])].sort((a, b) => b - a);
  const out: number[] = [];
  let left = amount;
  for (const chip of sorted) {
    while (left >= chip && out.length < 40) {
      out.push(chip);
      left -= chip;
    }
  }
  return out.reverse().slice(-6);
}

function amountText(amount: number): HTMLElement {
  const b = document.createElement('b');
  b.textContent = amount >= 10_000 ? chipLabel(amount) : points(amount);
  return b;
}

/**
 * Draws the chips on a big spot: this page's as a stack (with the amount beside it) and everyone
 * else's as their picture and how much (on a phone), or everyone's as stacks side by side in seat
 * order, each with its owner's picture and amount under it (on a computer). The spot has an empty
 * `.tb-stack`, `.tb-others` and `.tb-piles` for them.
 */
export function renderPiles(el: HTMLElement, piles: Pile[], chips: readonly number[]): void {
  const stack = el.querySelector('.tb-stack') as HTMLElement;
  stack.textContent = '';
  const mine = piles.find((p) => p.mine);
  if (mine) {
    stackChips(mine.amount, chips).forEach((value, i) => {
      const chip = chipEl(value);
      chip.style.setProperty('--i', String(i));
      stack.append(chip);
    });
    const label = document.createElement('span');
    label.className = 'tb-stack-amount';
    label.textContent = points(mine.amount);
    stack.append(label);
  }
  const row = el.querySelector('.tb-others') as HTMLElement;
  row.textContent = '';
  for (const pile of piles) {
    if (pile.mine) continue;
    const pill = document.createElement('span');
    pill.className = 'tb-other';
    if (pile.outcome) pill.classList.add(pile.outcome);
    if (pile.refused) pill.classList.add('refused');
    pill.append(avatarImg(pile.seat, 'tb-other-avatar'), amountText(pile.amount));
    pill.title = `${pile.seat.name}: ${points(pile.amount)}`;
    row.append(pill);
  }
  const heaps = el.querySelector('.tb-piles') as HTMLElement;
  heaps.textContent = '';
  for (const pile of piles) {
    const heap = document.createElement('span');
    heap.className = 'tb-pile';
    if (pile.mine) heap.classList.add('mine');
    if (pile.outcome) heap.classList.add(pile.outcome);
    if (pile.refused) heap.classList.add('refused');
    heap.title = `${pile.mine ? 'You' : pile.seat.name}: ${points(pile.amount)}`;
    const stacked = document.createElement('span');
    stacked.className = 'tb-pile-chips';
    const values = stackChips(pile.amount, chips);
    values.forEach((value, i) => {
      const chip = chipEl(value);
      chip.style.setProperty('--i', String(i));
      stacked.append(chip);
    });
    stacked.style.setProperty('--n', String(values.length));
    const tag = document.createElement('span');
    tag.className = 'tb-pile-tag';
    tag.append(avatarImg(pile.seat, 'tb-pile-avatar'), amountText(pile.amount));
    heap.append(stacked, tag);
    heaps.append(heap);
  }
  // A busy spot (up to 8 players at a table) gets smaller piles, so they still fit side by side.
  heaps.classList.toggle('crowded', heaps.childElementCount > 4);
}

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

// ---------------------------------------------------------------------------

/** Plays `game` on this page. */
export function startTable<S extends string, R, X = unknown>(game: TableGame<S, R, X>): void {
  type State = TableState<S, R, X>;

  const panel = document.querySelector('[data-table-panel]') as HTMLElement;
  panel.innerHTML = `
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
  const players = document.querySelector('[data-table-players]') as HTMLElement;
  players.innerHTML = `<h2 class="tb-players-title">At the table <span></span></h2><ol class="tb-players-list"></ol>`;

  const inPanel = <T extends HTMLElement>(selector: string): T => panel.querySelector(selector) as T;
  const ui = {
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
    message: $('message'),
    messageTitle: $('message-title'),
    messageText: $('message-text'),
  };
  const { words } = game;
  ui.dealVote.textContent = words.button;

  // -------------------------------------------------------------------------
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

  soundButton(`${game.key}-muted`, setMuted);

  // -------------------------------------------------------------------------
  // What is on the table

  /** The table as the bot last said. */
  let state: State | null = null;
  /** This page's chips: what the bot last confirmed, changed straight away as chips go down (and sent). */
  let bets: Bets<S> = {};
  let history: { spot: S; amount: number }[] = [];
  /** The chip picked in the rack (tapping a spot puts one of these on it). */
  let selected = 0;
  /** When the phase ends, on this page's clock. */
  let deadline = 0;
  /** The betting time as a whole, for the bar: the most time left seen in this betting phase. */
  let bettingWhole = 60_000;
  /** The round shown on the felt (its number), and whether it is still being played out. */
  let shownRound = 0;
  let dealingOut = false;
  let rackBuilt = false;
  /** A change of chips was refused: the table that follows has the chips that are really down. */
  let adoptBets = false;

  const SELECTED_KEY = `${game.key}.chip`;
  const mySeat = (): SeatView<S> | undefined => state?.seats.find((s) => s.userId === state?.you);
  const onTable = (b: Bets<S> = bets): number => sumBets(b);
  const balance = (): number | null => mySeat()?.balance ?? null;
  /** Chips can't be touched: watching, not seated yet, or the round isn't taking bets. */
  const busy = (): boolean => watching || !state || !mySeat() || state.phase !== 'betting';
  /** The round is all out on the felt, and how everyone did shows. */
  const showingResults = (): boolean => !dealingOut && state?.phase === 'dealing';

  function showError(text: string | null): void {
    ui.error.hidden = text === null;
    ui.error.textContent = text ?? '';
  }

  function renderSpots(): void {
    const results = showingResults();
    const mine = results ? mySeat()?.result : null;
    const outcomes = new Map((mine?.bets ?? []).map((b) => [b.spot, b.outcome]));
    for (const [spot, el] of game.spots) {
      const piles: Pile<S>[] = [];
      for (const seat of state?.seats ?? []) {
        const isMine = seat.userId === state?.you;
        const amount = (isMine ? bets[spot] : seat.bets[spot]) ?? 0;
        if (amount <= 0) continue;
        const outcome = results ? seat.result?.bets.find((b) => b.spot === spot)?.outcome : undefined;
        piles.push({ seat, amount, mine: isMine, outcome, refused: results && seat.refused });
      }
      (game.renderSpot ?? renderPiles)(el, piles, state?.chips ?? []);
      const outcome = outcomes.get(spot);
      el.classList.toggle('won', outcome === 'win');
      el.classList.toggle('lost', outcome === 'lose');
      el.classList.toggle('push', outcome === 'push');
      el.classList.toggle('has-chips', (bets[spot] ?? 0) > 0);
    }
  }

  function renderPlayers(): void {
    ui.players.textContent = '';
    if (!state) return;
    ui.tableNo.textContent = `· Table ${state.table}`;
    ui.seatCount.textContent = `${state.seats.length}/${state.maxSeats}`;
    const results = showingResults();
    for (const seat of state.seats) {
      const li = document.createElement('li');
      li.className = 'tb-seat';
      if (seat.userId === state.you) li.classList.add('you');
      // The name is cut short if it's long, but the "you" tag after it always shows.
      const name = document.createElement('div');
      name.className = 'tb-seat-name';
      const nameText = document.createElement('span');
      nameText.textContent = seat.name;
      name.append(nameText);
      if (state.phase === 'betting' && seat.ready && state.seats.length > 1) {
        const ready = document.createElement('span');
        ready.className = 'tb-ready';
        ready.textContent = '✓';
        ready.title = `Voted to ${words.verb} now`;
        name.append(ready);
      }
      if (seat.userId === state.you) {
        const tag = document.createElement('span');
        tag.className = 'tb-you';
        tag.textContent = watching ? 'watching' : 'you';
        name.append(tag);
      }
      const money = document.createElement('div');
      money.className = 'tb-seat-balance';
      money.append(points(seat.balance), coin());
      const status = document.createElement('div');
      status.className = 'tb-seat-status';
      const down = sumBets(seat.userId === state.you ? bets : seat.bets);
      if (results && seat.result) {
        status.textContent = signedPoints(seat.result.net);
        status.classList.add(seat.result.net > 0 ? 'won' : seat.result.net < 0 ? 'lost' : 'even');
      } else if (results && seat.refused) {
        status.textContent = 'Couldn’t cover the bet';
        status.classList.add('lost');
      } else if (down > 0) {
        status.textContent = `${points(down)} down`;
        status.classList.add('down');
      } else {
        status.textContent = state.phase === 'betting' ? 'Placing chips…' : 'Sat out';
      }
      const text = document.createElement('div');
      text.className = 'tb-seat-text';
      text.append(name, money);
      li.append(avatarImg(seat, 'tb-seat-avatar'), text, status);
      ui.players.append(li);
    }
    for (let i = state.seats.length; i < state.maxSeats; i++) {
      const li = document.createElement('li');
      li.className = 'tb-seat empty';
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
    // Deal now: alone it deals straight away; with others it's a vote, dealt once everyone has voted.
    const seats = state?.seats ?? [];
    const voted = mySeat()?.ready ?? false;
    const chipsDown = seats.some((s) => sumBets(s.userId === state?.you ? bets : s.bets) > 0);
    ui.dealVote.disabled = idle || (!chipsDown && !voted);
    ui.dealVote.classList.toggle('voted', voted);
    ui.dealVote.setAttribute('aria-pressed', String(voted));
    ui.dealVote.textContent = seats.length <= 1 ? words.button : `${voted ? 'Voted' : words.button} · ${seats.filter((s) => s.ready).length}/${seats.length}`;
    ui.dealVote.title = seats.length <= 1 ? words.alone : voted ? `Take back your vote to ${words.verb} now` : `Vote to ${words.verb} now: ${words.together}`;
    for (const chip of ui.rack.querySelectorAll<HTMLElement>('.tb-chip')) {
      chip.classList.toggle('picked', Number(chip.dataset.value) === selected);
      chip.classList.toggle('off', idle || !fits(onTable() + Number(chip.dataset.value)));
    }
    for (const el of game.spots.values()) if (el instanceof HTMLButtonElement) el.disabled = watching;
  }

  function render(): void {
    renderSpots();
    renderPlayers();
    renderBar();
    renderTimer();
    if (state) game.render?.(state);
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
        ? `Place your bets · ${words.soon} ${seconds}s`
        : words.doing
      : dealingOut
        ? words.doing
        : `Next round in ${seconds}s`;
  }

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

  function place(spot: S, amount: number): void {
    if (amount <= 0) return;
    if (busy()) {
      if (!watching && state?.phase === 'dealing') showError('Wait for the next round to bet.');
      return;
    }
    const problem = whyNot(onTable() + amount);
    if (problem) {
      showError(problem);
      shake(game.spots.get(spot));
      return;
    }
    showError(null);
    bets = { ...bets, [spot]: (bets[spot] ?? 0) + amount };
    history.push({ spot, amount });
    play('place');
    sendBets();
    render();
    const stack = game.spots.get(spot)?.querySelector('.tb-stack');
    stack?.lastElementChild?.previousElementSibling?.classList.add('drop');
  }

  /** Takes every chip of this page's off `spot` (back to the rack). */
  function takeBack(spot: S, withSound = true): void {
    if (busy() || !(bets[spot] ?? 0)) return;
    const rest = { ...bets };
    delete rest[spot];
    bets = rest;
    history = history.filter((h) => h.spot !== spot);
    if (withSound) play('move');
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

  // -------------------------------------------------------------------------
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

  function pick(value: number, withSound = true): void {
    selected = value;
    remember(SELECTED_KEY, String(value));
    if (withSound) play('move');
    renderBar();
  }

  type DragFrom = { from: 'rack'; value: number } | { from: 'spot'; spot: S };

  const spotOf = (el: Element | null): S | undefined => el?.closest<HTMLElement>('[data-spot]')?.dataset.spot as S | undefined;

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

    const spotAt = (x: number, y: number): HTMLElement | null => {
      const spot = spotOf(document.elementFromPoint(x, y));
      return spot ? (game.spots.get(spot) ?? null) : null;
    };

    const move = (ev: PointerEvent): void => {
      if (busy()) return;
      if (!ghost && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
      if (!ghost) {
        const value = from.from === 'rack' ? from.value : (bets[from.spot] ?? 0);
        ghost = from.from === 'rack' ? chipEl(value) : chipEl(stackChips(value, state?.chips ?? []).at(-1) ?? value);
        if (from.from === 'spot') ghost.textContent = chipLabel(value);
        ghost.classList.add('tb-ghost');
        document.body.append(ghost);
        if (from.from === 'spot') game.spots.get(from.spot)?.classList.add('lifting');
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
      if (from.from === 'spot') game.spots.get(from.spot)?.classList.remove('lifting');
      const dropped = ghost ? spotAt(ev.clientX, ev.clientY) : null;
      ghost?.remove();
      const to = spotOf(dropped);
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

  for (const [spot, el] of game.spots) {
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
    play('move');
    showError(null);
    sendBets();
    render();
  });

  ui.clear.addEventListener('click', () => {
    if (busy() || onTable() === 0) return;
    play('move');
    bets = {};
    history = [];
    showError(null);
    sendBets();
    render();
  });

  /** Every spot with chips on in `b`, and how many. */
  const spotsIn = (b: Bets<S>): [S, number][] => (Object.entries(b) as [S, number | undefined][]).filter((e): e is [S, number] => (e[1] ?? 0) > 0);

  ui.rebet.addEventListener('click', () => {
    const last = mySeat()?.lastBets;
    if (busy() || !last) return;
    for (const [spot, amount] of spotsIn(last)) place(spot, amount);
  });

  ui.dealVote.addEventListener('click', () => {
    if (busy()) return;
    send({ t: 'deal', ready: !(mySeat()?.ready ?? false) });
  });

  ui.double.addEventListener('click', () => {
    if (busy()) return;
    const problem = whyNot(onTable() * 2);
    if (problem) return showError(problem);
    for (const [spot, amount] of spotsIn(bets)) place(spot, amount);
  });

  // -------------------------------------------------------------------------
  // Showing a round

  /**
   * Counts up to cancel a round being played out: a page in a background tab has its timers slowed,
   * so the next round's betting can start before it's all out.
   */
  let playing = 0;

  function clearRound(): void {
    game.clear();
    ui.result.hidden = true;
    ui.felt.classList.remove('last-round');
  }

  /** Shows a round at once: faded (the last round, while the next one takes bets), or with how it went. */
  function showRound(round: RoundOf<R>, faded: boolean): void {
    playing += 1;
    dealingOut = false;
    shownRound = round.no;
    clearRound();
    game.show(round);
    if (faded) {
      ui.felt.classList.add('last-round');
      return;
    }
    game.reveal(round);
    showResult(round);
  }

  /** Plays `round` out on the felt, then shows how it went. */
  async function playOut(round: RoundOf<R>): Promise<void> {
    const mine = ++playing;
    dealingOut = true;
    shownRound = round.no;
    clearRound();
    render();
    await game.animate(round, () => mine === playing);
    if (mine !== playing) return;
    dealingOut = false;
    game.reveal(round);
    showResult(round);
    render();
  }

  /** How the round went for this page's player: what they won or lost, or that they sat it out. */
  function showResult(round: RoundOf<R>): void {
    const text = game.describe(round);
    const me = mySeat();
    const net = me?.result?.net ?? null;
    if (net === null) {
      // No chips down (or refused): just how the round went.
      ui.result.classList.remove('lost');
      ui.result.classList.add('even');
      ui.resultTitle.textContent = me?.refused ? 'Bet refused' : 'Sat out';
    } else {
      ui.result.classList.toggle('lost', net < 0);
      ui.result.classList.toggle('even', net === 0);
      ui.resultTitle.textContent = signedPoints(net);
      ui.resultTitle.append(' ', coin());
      play(net > 0 ? 'win' : net < 0 ? 'lose' : 'even');
    }
    ui.resultText.textContent = text;
    ui.result.hidden = false;
  }

  // -------------------------------------------------------------------------
  // Talking to the bot

  let socket: WebSocket | null = null;
  let finished = false;
  let retries = 0;
  const RETRY_MAX_MS = 5000;

  const ERRORS: Record<ErrorCode, [string, string]> = {
    bad_token: ['This link has run out', `Open ${game.name} again from the games page or from Discord for a new one.`],
    replaced: ['Opened somewhere else', `${game.title} is open in another tab or window. Only one can play at a time.`],
    bad_message: ['Disconnected', 'The bot could not understand this page. Try reloading.'],
    not_playing: ['Nobody to watch', `They aren't playing ${game.name} right now. Pick someone else from the online list.`],
    full: ['Too many watching', 'As many people as can are already watching them. Try again in a bit.'],
  };

  function send(message: ClientMessage<S>): boolean {
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
        return 'Too late: the betting for this round is over.';
    }
  }

  /** The table as the bot says it is now. */
  function showState(next: State): void {
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

    // A new round dealt: play it out. Joining (or back) mid-round: it at once. Betting after one: it, faded.
    if (next.phase === 'dealing' && next.round && next.round.no !== shownRound) {
      if (before === null || before.phase === 'dealing') showRound(next.round, false);
      else void playOut(next.round);
    } else if (next.phase === 'betting' && next.round && (shownRound !== next.round.no || before?.phase === 'dealing')) {
      showRound(next.round, true);
    }
    render();
  }

  function receive(message: ServerMessage<S, R, X>): void {
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
          () => showMessage(`${watched} left the table`, `${watched} isn't playing ${game.name} any more. Head back home to see who's online and watch someone else.`),
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
        receive(JSON.parse(String(e.data)) as ServerMessage<S, R, X>);
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

  // -------------------------------------------------------------------------
  // Start

  setInterval(renderTimer, 200);
  render();
  if (!token || !server) {
    setConn('No link', 'bad');
    showMessage('Open this from the games page', `Log in on the games page and pick ${game.title}, or use the ${game.name} command in Discord.`);
  } else {
    connect();
    startLive({ mount: barSlot(), api: apiFromSocket(server), auth: () => `Game ${token}`, newTab: !watching });
  }
}
