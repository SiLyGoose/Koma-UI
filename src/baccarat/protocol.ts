/*
 * What this page and the bot say to each other over the WebSocket: the shared tables' messages
 * (../table/protocol.ts), with baccarat's spots, round and payouts. A copy of the bot's
 * src/web/baccarat/protocol.ts (the Koma repo): change both together.
 */

import type * as table from '../table/protocol';

export type Spot = 'player' | 'banker' | 'tie' | 'kirin' | 'phoenix';
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
/** `rank` is 1 for the ace, 2 to 10, then 11 (jack), 12 (queen) and 13 (king). */
export interface Card {
  rank: number;
  suit: Suit;
}

export interface BaccaratRoundView {
  player: Card[];
  banker: Card[];
  order: ('player' | 'banker')[];
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  natural: boolean;
}

export interface BaccaratExtras {
  payouts: Record<Spot, number>;
}

export type RoundView = table.RoundOf<BaccaratRoundView>;
export type TableState = table.TableState<Spot, BaccaratRoundView, BaccaratExtras>;
