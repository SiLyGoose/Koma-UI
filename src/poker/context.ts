import type { GameSocket } from '../shared/game';
import type { ClientMessage, PlayerMove, PokerState, SeatView } from './protocol';

/** Everything the page knows: the table as the bot last said, and what it has shown of it so far. */
export interface PokerContext {
  socket: GameSocket<ClientMessage> | null;
  state: PokerState | null;
  /** When the turn being played (or the wait for the next hand) ends, on this page's clock, and how long it was in all. */
  deadline: number;
  whole: number;
  /** The hand whose board is on the felt, and how many of its cards have been shown (to deal in only the new ones). */
  boardHand: number;
  boardShown: number;
  /** The hand whose cards have been dealt out to the seats (to play the deal once). */
  dealtHand: number;
  /** What each seat had in front of it, to hear chips going in. */
  bets: Map<number, number>;
  /** The hand this page last heard a turn for, and its street and seat (to tick once a turn). */
  turnKey: string;
  /** The hand a win was last played for. */
  wonHand: number;
  /** What the raise slider is set to, and whether the player has touched it this turn. */
  raiseTo: number;
  raiseTouched: boolean;
  /** The chips to sit down with. */
  sitChips: number;
}

export const newContext = (): PokerContext => ({
  socket: null,
  state: null,
  deadline: 0,
  whole: 1,
  boardHand: 0,
  boardShown: 0,
  dealtHand: 0,
  bets: new Map(),
  turnKey: '',
  wonHand: 0,
  raiseTo: 0,
  raiseTouched: false,
  sitChips: 0,
});

/** This page's player's seat, or null while they aren't sitting. */
export const mySeat = (ctx: PokerContext): SeatView | null => ctx.state?.seats.find((s) => s?.id === ctx.state?.you) ?? null;

/** It's this page's player's turn. */
export const myTurn = (ctx: PokerContext): boolean => ctx.state?.move != null;

/** Says `message` to the bot; false when not connected right now. */
export const send = (ctx: PokerContext, message: ClientMessage): boolean => ctx.socket?.send(message) ?? false;

const points = (n: number): string => n.toLocaleString('en-US');

/** What a player did last, in a word or two ("Raise to 400"). `big` tells the big blind from the small. */
export function moveText(move: PlayerMove, big: number): string {
  switch (move.type) {
    case 'blind':
      return move.amount >= big ? `Big blind` : 'Small blind';
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return `Call ${points(move.amount)}`;
    case 'bet':
      return `Bet ${points(move.to)}`;
    case 'raise':
      return `Raise to ${points(move.to)}`;
    case 'allIn':
      return 'All in';
  }
}

export function showError(text: string | null): void {
  const el = document.getElementById('error') as HTMLElement;
  el.hidden = text === null;
  el.textContent = text ?? '';
}
