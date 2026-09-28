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

export type ClientMessage = { t: 'hello'; token: string } | { t: 'watch'; token: string } | { t: 'deal'; bets: Bets; seq: number };

export interface Table {
  player: string;
  balance: number;
  minBet: number;
  maxBet: number;
  chips: number[];
  payouts: Record<Spot, number>;
  lastBets: Bets | null;
}

export interface RoundView {
  player: Card[];
  banker: Card[];
  order: ('player' | 'banker')[];
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  natural: boolean;
  bets: { spot: Spot; amount: number; outcome: 'win' | 'push' | 'lose'; returned: number }[];
  bet: number;
  payout: number;
  net: number;
  balance: number;
}

export type ErrorCode = 'bad_token' | 'replaced' | 'bad_message' | 'not_playing' | 'full';

export type DealRefusal = { reason: 'too_small' | 'too_big'; limit: number } | { reason: 'too_poor'; balance: number } | { reason: 'busy' };

export type ServerMessage =
  | { t: 'table'; table: Table }
  | { t: 'round'; seq: number; round: RoundView }
  | ({ t: 'refused'; seq: number } & DealRefusal)
  | { t: 'error'; code: ErrorCode }
  | { t: 'watching'; player: string }
  | { t: 'watchers'; count: number }
  | { t: 'away' };
