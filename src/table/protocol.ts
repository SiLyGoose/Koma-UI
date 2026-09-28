/*
 * What a shared-table game's page (baccarat, roulette) and the bot say to each other over the
 * WebSocket. A copy of the bot's src/web/table/protocol.ts (the Koma repo): change both together.
 * See there for how it goes. Each game fills in its spots (`S`), its round (`R`) and anything else it
 * puts on the table (`X`).
 */

export type Bets<S extends string = string> = Partial<Record<S, number>>;
export type Outcome = 'win' | 'push' | 'lose';

export type ClientMessage<S extends string = string> =
  | { t: 'hello'; token: string }
  | { t: 'watch'; token: string }
  | { t: 'bets'; bets: Bets<S>; seq: number }
  | { t: 'deal'; ready: boolean };

export interface SettledView<S extends string = string> {
  spot: S;
  amount: number;
  outcome: Outcome;
  returned: number;
}

export interface SeatView<S extends string = string> {
  userId: string;
  name: string;
  avatar: string;
  balance: number;
  bets: Bets<S>;
  result: { bets: SettledView<S>[]; bet: number; payout: number; net: number } | null;
  refused: boolean;
  lastBets: Bets<S> | null;
  ready: boolean;
}

export type RoundOf<R> = { no: number } & R;

export type TableState<S extends string = string, R = unknown, X = unknown> = {
  table: number;
  you: string;
  seats: SeatView<S>[];
  phase: 'betting' | 'dealing';
  msLeft: number;
  round: RoundOf<R> | null;
  minBet: number;
  maxBet: number;
  maxSeats: number;
  chips: number[];
} & X;

export type ErrorCode = 'bad_token' | 'replaced' | 'bad_message' | 'not_playing' | 'full';

export type BetRefusal = { reason: 'too_big'; limit: number } | { reason: 'too_poor'; balance: number } | { reason: 'closed' };

export type ServerMessage<S extends string = string, R = unknown, X = unknown> =
  | { t: 'table'; state: TableState<S, R, X> }
  | ({ t: 'refused'; seq: number } & BetRefusal)
  | { t: 'error'; code: ErrorCode }
  | { t: 'watching'; player: string }
  | { t: 'watchers'; count: number }
  | { t: 'away' };
