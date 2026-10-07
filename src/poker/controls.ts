import { points } from '../shared/util';
import { mySeat, myTurn, send, showError, type PokerContext } from './context';
import type { PokerMove, PokerState } from './protocol';

/*
 * What this page's player can do. Not sitting: pick how many chips to sit down with (from the
 * table's buy-in range, up to their balance) and sit down (or press an empty seat). Sitting: on
 * their turn Fold, Check or Call, and Bet or Raise to an amount (the slider, or a share of the pot)
 * or go All in; F, C and R do the same from the keyboard. Any time: stand up, or add a bot.
 */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const ui = {
  sit: $('sit'),
  sitRange: $('sit-range'),
  sitSlider: $<HTMLInputElement>('sit-slider'),
  sitInput: $<HTMLInputElement>('sit-input'),
  sitBalance: $('sit-balance'),
  sitButton: $<HTMLButtonElement>('sit-button'),
  moves: $('moves'),
  raiseBox: $('raise-box'),
  raiseSlider: $<HTMLInputElement>('raise-slider'),
  raiseInput: $<HTMLInputElement>('raise-input'),
  presets: [...document.querySelectorAll<HTMLButtonElement>('[data-preset]')],
  fold: document.querySelector('[data-move="fold"]') as HTMLButtonElement,
  call: $<HTMLButtonElement>('call-button'),
  raise: $<HTMLButtonElement>('raise-button'),
  allIn: $<HTMLButtonElement>('allin-button'),
  blinds: $('blinds'),
  myChips: $('my-chips'),
  balance: $('balance'),
  bot: $<HTMLButtonElement>('bot-button'),
  stand: $<HTMLButtonElement>('stand-button'),
};

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(n)));

/** The chips the player can sit down with: the table's range, up to their balance (null when they can't afford the least). */
function sitRange(state: PokerState): { min: number; max: number } | null {
  const max = Math.min(state.buyIn.max, state.balance);
  return max >= state.buyIn.min ? { min: state.buyIn.min, max } : null;
}

/** What a share of the pot comes to as a raise: the call, then that share of the pot after it, on top of the bet to match. */
function potRaise(state: PokerState, share: number): number {
  const hand = state.hand;
  const move = state.move;
  if (!hand || !move) return 0;
  return hand.currentBet + (hand.pot + move.call) * share;
}

function setRaise(ctx: PokerContext, to: number): void {
  const range = ctx.state?.move?.raise;
  if (!range) return;
  ctx.raiseTo = clamp(to, range.min, range.max);
  ui.raiseSlider.value = String(ctx.raiseTo);
  ui.raiseInput.value = String(ctx.raiseTo);
  renderMoveLabels(ctx);
}

function renderMoveLabels(ctx: PokerContext): void {
  const state = ctx.state;
  const move = state?.move;
  const hand = state?.hand;
  const me = ctx.state ? mySeat(ctx) : null;
  ui.call.textContent = '';
  ui.call.dataset.move = move?.check ? 'check' : 'call';
  const callLabel = !move ? 'Call' : move.check ? 'Check' : me && move.call >= me.chips ? `Call ${points(move.call)} (all in)` : `Call ${points(move.call)}`;
  ui.call.append(callLabel, Object.assign(document.createElement('kbd'), { textContent: 'C' }));
  ui.raise.textContent = '';
  const verb = hand && hand.currentBet === 0 ? 'Bet' : 'Raise to';
  ui.raise.append(move?.raise ? `${verb} ${points(ctx.raiseTo)}` : 'Raise', Object.assign(document.createElement('kbd'), { textContent: 'R' }));
  ui.allIn.textContent = me ? `All in ${points(me.chips + me.bet)}` : 'All in';
}

/** Draws the panel for the table as it is now. */
export function renderControls(ctx: PokerContext): void {
  const state = ctx.state;
  if (!state) return;
  const me = mySeat(ctx);
  ui.blinds.textContent = `${points(state.blinds.small)}/${points(state.blinds.big)}`;
  ui.myChips.textContent = me ? points(me.chips) : '–';
  ui.balance.textContent = points(state.balance);

  // Sitting down.
  ui.sit.hidden = me !== null;
  if (!me) {
    const range = sitRange(state);
    ui.sitBalance.textContent = points(state.balance);
    ui.sitButton.disabled = range === null;
    ui.sitSlider.disabled = range === null;
    ui.sitInput.disabled = range === null;
    if (range) {
      ui.sitRange.textContent = `${points(range.min)} to ${points(range.max)} chips`;
      ui.sitSlider.min = ui.sitInput.min = String(range.min);
      ui.sitSlider.max = ui.sitInput.max = String(range.max);
      ui.sitSlider.step = String(state.blinds.big);
      // A sensible start: as much as they may bring (and can).
      if (ctx.sitChips < range.min || ctx.sitChips > range.max) ctx.sitChips = range.max;
      ui.sitSlider.value = ui.sitInput.value = String(ctx.sitChips);
    } else {
      ui.sitRange.textContent = `You need at least ${points(state.buyIn.min)} to sit down`;
    }
  }

  // Moves.
  ui.moves.hidden = me === null;
  const move = state.move;
  const mine = myTurn(ctx);
  for (const b of [ui.fold, ui.call, ui.raise, ui.allIn]) b.disabled = !mine;
  ui.raise.disabled = !move?.raise;
  ui.raiseBox.classList.toggle('off', !move?.raise);
  for (const b of [...ui.presets]) b.disabled = !move?.raise;
  ui.raiseSlider.disabled = ui.raiseInput.disabled = !move?.raise;
  if (move?.raise) {
    ui.raiseSlider.min = ui.raiseInput.min = String(move.raise.min);
    ui.raiseSlider.max = ui.raiseInput.max = String(move.raise.max);
    ui.raiseSlider.step = '1';
    if (!ctx.raiseTouched || ctx.raiseTo < move.raise.min || ctx.raiseTo > move.raise.max) ctx.raiseTo = move.raise.min;
    ui.raiseSlider.value = ui.raiseInput.value = String(ctx.raiseTo);
  }
  ui.moves.classList.toggle('mine', mine);
  renderMoveLabels(ctx);

  ui.stand.hidden = me === null;
  const inHand = me?.inHand && !me.folded && state.hand && !state.hand.result;
  ui.stand.textContent = inHand ? 'Stand up (fold)' : 'Stand up';
  ui.bot.hidden = !state.canAddBot;
}

/** Makes a move, if it's this player's turn. */
function move(ctx: PokerContext, which: PokerMove): void {
  if (!myTurn(ctx)) return;
  showError(null);
  if (which === 'raise') {
    if (!ctx.state?.move?.raise) return;
    send(ctx, { t: 'act', move: 'raise', amount: ctx.raiseTo });
  } else {
    send(ctx, { t: 'act', move: which });
  }
}

export function wireControls(ctx: PokerContext): void {
  const sit = (): void => {
    showError(null);
    send(ctx, { t: 'sit', chips: ctx.sitChips });
  };
  ui.sitButton.addEventListener('click', sit);
  const sitTo = (value: string): void => {
    const state = ctx.state;
    const range = state ? sitRange(state) : null;
    if (!range) return;
    ctx.sitChips = clamp(Number(value) || range.min, range.min, range.max);
    ui.sitSlider.value = ui.sitInput.value = String(ctx.sitChips);
  };
  ui.sitSlider.addEventListener('input', () => sitTo(ui.sitSlider.value));
  ui.sitInput.addEventListener('change', () => sitTo(ui.sitInput.value));
  ui.sitInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sitTo(ui.sitInput.value);
      sit();
    }
  });

  const raiseTo = (value: string): void => {
    ctx.raiseTouched = true;
    setRaise(ctx, Number(value) || 0);
  };
  ui.raiseSlider.addEventListener('input', () => raiseTo(ui.raiseSlider.value));
  ui.raiseInput.addEventListener('change', () => raiseTo(ui.raiseInput.value));
  ui.raiseInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      raiseTo(ui.raiseInput.value);
      move(ctx, 'raise');
    }
  });
  const shares: Record<string, number> = { half: 0.5, threeQuarter: 0.75, pot: 1 };
  for (const b of ui.presets) {
    b.addEventListener('click', () => {
      const state = ctx.state;
      const range = state?.move?.raise;
      if (!state || !range) return;
      ctx.raiseTouched = true;
      const preset = b.dataset.preset as string;
      setRaise(ctx, preset === 'min' ? range.min : potRaise(state, shares[preset] ?? 1));
    });
  }

  ui.fold.addEventListener('click', () => move(ctx, 'fold'));
  ui.call.addEventListener('click', () => move(ctx, ui.call.dataset.move === 'check' ? 'check' : 'call'));
  ui.raise.addEventListener('click', () => move(ctx, 'raise'));
  ui.allIn.addEventListener('click', () => move(ctx, 'allIn'));
  ui.stand.addEventListener('click', () => {
    showError(null);
    send(ctx, { t: 'stand' });
  });
  ui.bot.addEventListener('click', () => {
    showError(null);
    send(ctx, { t: 'bot', add: true });
  });

  // F, C and R on the keyboard (not while typing an amount).
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey || !myTurn(ctx)) return;
    const key = e.key.toLowerCase();
    if (key === 'f') move(ctx, 'fold');
    else if (key === 'c') move(ctx, ui.call.dataset.move === 'check' ? 'check' : 'call');
    else if (key === 'r') move(ctx, 'raise');
    else return;
    e.preventDefault();
  });
}
