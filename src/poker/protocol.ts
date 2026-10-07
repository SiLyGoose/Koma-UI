/*
 * What this page and the bot say to each other over the WebSocket. A copy of the bot's
 * src/web/games/poker/protocol.ts (the Koma repo): change both together. The bot only ever sends this
 * page its own player's cards (and anyone's once they're face up).
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
/** `rank` is 1 for the ace, 2 to 10, then 11 (jack), 12 (queen) and 13 (king). */
export interface Card {
  rank: number;
  suit: Suit;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

/** What a player did last. */
export type PlayerMove =
  | { type: 'blind'; amount: number }
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call'; amount: number }
  | { type: 'bet'; to: number }
  | { type: 'raise'; to: number }
  | { type: 'allIn'; to: number };

export type PokerMove = 'fold' | 'check' | 'call' | 'raise' | 'allIn';

export type ClientMessage =
  | { t: 'hello'; token: string }
  | { t: 'sit'; chips: number; seat?: number }
  | { t: 'stand' }
  | { t: 'act'; move: PokerMove; amount?: number }
  | { t: 'bot'; add: true }
  | { t: 'bot'; add: false; seat: number };

export interface SeatView {
  seat: number;
  /** The member's id, or the bot's ("bot:1"). */
  id: string;
  name: string;
  /** Their profile picture (empty for a bot). */
  avatar: string;
  bot: boolean;
  /** Chips behind them. */
  chips: number;
  /** Chips in front of them this street. */
  bet: number;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  /** Their cards: only this page's player's, or anyone's face up. */
  cards: Card[] | null;
  last: PlayerMove | null;
  away: boolean;
  leaving: boolean;
}

export interface PotView {
  amount: number;
  seats: number[];
  hand: string | null;
}

export interface HandView {
  no: number;
  button: number;
  street: Street;
  board: Card[];
  pot: number;
  toAct: number | null;
  currentBet: number;
  result: {
    pots: PotView[];
    rake: number;
    won: Record<number, number>;
    shown: Record<number, { best: Card[]; hand: string }>;
  } | null;
}

export interface YourMove {
  check: boolean;
  call: number;
  raise: { min: number; max: number } | null;
}

export interface PokerState {
  table: number;
  you: string;
  seats: (SeatView | null)[];
  hand: HandView | null;
  move: YourMove | null;
  msLeft: number;
  phase: 'waiting' | 'next' | 'playing';
  blinds: { small: number; big: number };
  buyIn: { min: number; max: number };
  rake: { rate: number; cap: number };
  balance: number;
  canAddBot: boolean;
  turnSeconds: number;
}

export type ErrorCode = 'bad_token' | 'replaced' | 'bad_message';

export type Refusal =
  | { reason: 'buy_in'; min: number; max: number }
  | { reason: 'too_poor'; balance: number }
  | { reason: 'seat_taken' }
  | { reason: 'not_now' }
  | { reason: 'failed' };

export type ServerMessage = { t: 'poker'; state: PokerState } | ({ t: 'refused' } & Refusal) | { t: 'error'; code: ErrorCode };
