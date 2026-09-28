/*
 * What this page and the bot say to each other over the WebSocket. A copy of the bot's
 * src/web/baccarat-protocol.ts (the Koma repo): change both together. See there for how it goes.
 */

export type Spot = 'player' | 'banker' | 'tie' | 'kirin' | 'phoenix';
export type Bets = Partial<Record<Spot, number>>;
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
/** `rank` is 1 for the ace, 2 to 10, then 11 (jack), 12 (queen) and 13 (king). */
export interface Card {
  rank: number;
  suit: Suit;
}

export type ClientMessage = { t: 'hello'; token: string } | { t: 'watch'; token: string } | { t: 'bets'; bets: Bets; seq: number };

export interface SettledView {
  spot: Spot;
  amount: number;
  outcome: 'win' | 'push' | 'lose';
  returned: number;
}

export interface SeatView {
  userId: string;
  name: string;
  avatar: string;
  balance: number;
  bets: Bets;
  result: { bets: SettledView[]; bet: number; payout: number; net: number } | null;
  refused: boolean;
  lastBets: Bets | null;
}

export interface RoundView {
  no: number;
  player: Card[];
  banker: Card[];
  order: ('player' | 'banker')[];
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  natural: boolean;
}

export interface TableState {
  table: number;
  you: string;
  seats: SeatView[];
  phase: 'betting' | 'dealing';
  msLeft: number;
  round: RoundView | null;
  minBet: number;
  maxBet: number;
  maxSeats: number;
  chips: number[];
  payouts: Record<Spot, number>;
}

export type ErrorCode = 'bad_token' | 'replaced' | 'bad_message' | 'not_playing' | 'full';

export type BetRefusal = { reason: 'too_big'; limit: number } | { reason: 'too_poor'; balance: number } | { reason: 'closed' };

export type ServerMessage =
  | { t: 'table'; state: TableState }
  | ({ t: 'refused'; seq: number } & BetRefusal)
  | { t: 'error'; code: ErrorCode }
  | { t: 'watching'; player: string }
  | { t: 'watchers'; count: number }
  | { t: 'away' };
