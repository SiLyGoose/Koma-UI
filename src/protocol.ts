/*
 * What this page and the Koma bot say to each other over the WebSocket. A copy of the bot's
 * src/web/mine-protocol.ts (in the Koma repo): change both together.
 *
 * The bot holds the field and only ever tells the page what has been dug, so nothing here gives
 * away where the dynamite is. The whole field is sent once the run is over.
 *
 * A link lets one member play: it opens their run if one is going, and the lobby otherwise,
 * where they can start a new one.
 *
 *   page -> bot   hello    first message: the token from the link
 *                 start    a new run with this bet (from the lobby)
 *                 move     one step; `seq` counts up from 1 with every start, move or cash out
 *                 cashout
 *   bot -> page   lobby    no run going: the balance and what a bet can be
 *                 state    the run as it is now, after the page's message `seq` (0: not after one)
 *                 refused  a start that couldn't happen, and why (nothing was taken)
 *                 error    and the bot closes the connection
 */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type MineOre = 'coal' | 'iron' | 'gold' | 'diamond';

export type ClientMessage =
  | { t: 'hello'; token: string }
  | { t: 'start'; bet: number | 'all'; seq: number }
  | { t: 'move'; dir: Direction; seq: number }
  | { t: 'cashout'; seq: number };

/** A tile as the page sees it: null while it is hidden. */
export type SeenTile = null | 'rock' | 'dynamite' | MineOre;

export type RunStatus = 'digging' | 'boom' | 'cashed' | 'idle' | 'failed';

export interface RunState {
  player: string;
  /** The field is size by size tiles, row by row from the top left. */
  size: number;
  tiles: SeenTile[];
  /** Which tiles have been dug (once the run is over every tile is in `tiles`, and these say which were dug). */
  dug: boolean[];
  pos: number;
  field: number;
  oresLeft: number;
  /** Dynamite on this field. */
  dynamite: number;
  bet: number;
  /** The player's points: after the bet was taken while it is played, after the payout once it is over (null if unknown). */
  balance: number | null;
  multiplier: number;
  /** What cashing out now pays, in points. */
  cashOut: number;
  status: RunStatus;
  /** What the run paid, once it is over (0 after dynamite). */
  payout: number | null;
  /** A run with no move for this long is cashed out by itself. */
  idleMs: number;
  values: Record<MineOre, number>;
  fieldBonus: number;
}

export type RunEvent =
  | { kind: 'walk' | 'edge' | 'rock' | 'boom' | 'cashout' | 'idle' | 'failed' }
  | { kind: 'ore'; ore: MineOre; gained: number }
  | { kind: 'cleared'; ore: MineOre; gained: number; bonus: number };

export type ErrorCode = 'bad_token' | 'replaced' | 'bad_message';

/** No run going: what the lobby needs to start one. */
export interface Lobby {
  player: string;
  balance: number;
  minBet: number;
  maxBet: number;
  /** The bet of the run just played, if any. */
  lastBet: number | null;
  /** How the first field of a new run is laid out. */
  ores: number;
  dynamite: number;
  values: Record<MineOre, number>;
  fieldBonus: number;
}

export type StartRefusal =
  | { reason: 'too_small' | 'too_big'; limit: number }
  | { reason: 'too_poor'; balance: number }
  | { reason: 'busy' };

export type ServerMessage =
  | { t: 'lobby'; lobby: Lobby }
  | { t: 'state'; seq: number; state: RunState; event?: RunEvent }
  | ({ t: 'refused'; seq: number } & StartRefusal)
  | { t: 'error'; code: ErrorCode };
