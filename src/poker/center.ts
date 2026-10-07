import { points } from '../shared/util';
import { cardEl, sameCard } from './cards';
import { mySeat, type PokerContext } from './context';
import type { Card, PokerState } from './protocol';
import { play } from './sfx';

/*
 * The middle of the felt: the board (each new card dealt in as it comes), the pot, and a line saying
 * what's going on: waiting for players, the next hand coming, whose turn it is, or who won what.
 */

const ui = {
  pot: document.getElementById('pot') as HTMLElement,
  potAmount: document.getElementById('pot-amount') as HTMLElement,
  board: document.getElementById('board') as HTMLElement,
  status: document.getElementById('status') as HTMLElement,
};

const STREET: Record<string, string> = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River' };

/** The cards that made the winning hands (to light up on the board). */
function winningCards(state: PokerState): Card[] {
  const result = state.hand?.result;
  if (!result) return [];
  return result.pots.flatMap((pot) => pot.seats.flatMap((seat) => result.shown[seat]?.best ?? []));
}

const nameOf = (state: PokerState, seat: number): string => {
  const s = state.seats[seat];
  return s ? (s.id === state.you ? 'You' : s.name) : 'Someone';
};

/** Who won the hand, pot by pot, in words. */
function resultText(state: PokerState): string {
  const result = state.hand?.result;
  if (!result) return '';
  return result.pots
    .map((pot, i) => {
      const who = pot.seats.map((seat) => nameOf(state, seat)).join(' and ');
      const verb = pot.seats.length > 1 ? 'split' : who === 'You' ? 'win' : 'wins';
      const which = result.pots.length > 1 ? (i === 0 ? ' the main pot' : ' a side pot') : '';
      return `${who} ${verb}${which} ${points(pot.amount)}${pot.hand ? ` with ${pot.hand.toLowerCase()}` : ''}`;
    })
    .join(' · ');
}

/** What's going on, when no hand is being played (or between its turns). */
export function statusText(ctx: PokerContext): string {
  const state = ctx.state;
  if (!state) return 'Connecting…';
  const hand = state.hand;
  const seconds = Math.ceil(Math.max(0, ctx.deadline - performance.now()) / 1000);
  if (hand?.result) return state.phase === 'next' ? `${resultText(state)} · Next hand in ${seconds}s` : resultText(state);
  if (state.phase === 'next') return `Next hand in ${seconds}s`;
  if (state.phase === 'waiting') {
    const players = state.seats.filter((s) => s !== null).length;
    if (!mySeat(ctx)) return 'Take a seat to play';
    return players < 2 ? 'Waiting for players · Add a bot to play now' : 'Waiting for players';
  }
  if (!hand || hand.toAct === null) return STREET[hand?.street ?? 'preflop'] ?? '';
  const turn = state.seats[hand.toAct];
  return turn?.id === state.you ? `Your turn · ${seconds}s` : `${turn?.name ?? 'Someone'}'s turn`;
}

export function renderCenter(ctx: PokerContext): void {
  const state = ctx.state;
  const hand = state?.hand ?? null;
  ui.pot.hidden = !hand || hand.pot <= 0;
  if (hand) ui.potAmount.textContent = points(hand.result ? hand.result.pots.reduce((sum, p) => sum + p.amount, 0) : hand.pot);

  if (!hand) {
    ui.board.replaceChildren();
    ctx.boardHand = 0;
    ctx.boardShown = 0;
  } else {
    if (ctx.boardHand !== hand.no) {
      ui.board.replaceChildren();
      ctx.boardHand = hand.no;
      ctx.boardShown = 0;
    }
    // Only the cards that have just come are dealt in; the rest were already there.
    for (let i = ctx.boardShown; i < hand.board.length; i++) {
      const el = cardEl(hand.board[i] as Card, true);
      el.style.animationDelay = `${(i - ctx.boardShown) * 140}ms`;
      ui.board.append(el);
    }
    if (hand.board.length > ctx.boardShown) play('card');
    ctx.boardShown = hand.board.length;
    const best = winningCards(state as PokerState);
    [...ui.board.children].forEach((el, i) => {
      const card = hand.board[i];
      el.classList.toggle('best', card !== undefined && best.some((b) => sameCard(b, card)));
      el.classList.toggle('dim', best.length > 0 && card !== undefined && !best.some((b) => sameCard(b, card)));
    });
  }
  ui.status.textContent = statusText(ctx);
  ui.status.classList.toggle('result', Boolean(hand?.result));
}

/** Just the status line (for the countdown). */
export function renderStatus(ctx: PokerContext): void {
  ui.status.textContent = statusText(ctx);
}
