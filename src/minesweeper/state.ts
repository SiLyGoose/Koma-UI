import type { GameSocket } from '../shared/game';
import type { BestView, ClientMessage, MinesweeperLevel, RoomState } from './protocol';

export const LEVEL_NAMES: Record<MinesweeperLevel, string> = { easy: 'Beginner', medium: 'Intermediate', hard: 'Expert' };

/** What more than one part of the page needs to know. */
export const state = {
  socket: null as GameSocket<ClientMessage> | null,
  /** The room as the bot last said. */
  room: null as RoomState | null,
  /** The server's fastest clears of each level, as the bot last said. */
  best: null as BestView | null,
  /** When the board's clock started, on this page's clock (performance.now()), while it's running. */
  clockAt: 0,
  /** The board (its `no`) whose popup saying how it ended has been closed. */
  closed: 0,
};

/** Says `message` to the bot; false when not connected right now. */
export const send = (message: ClientMessage): boolean => state.socket?.send(message) ?? false;

/** A time used, like "1:05". */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** A time to the hundredth of a second, like "1:05.32": the leaderboard's, where a second is a long time. */
export function exactClock(ms: number): string {
  const hundredths = Math.floor(ms / 10);
  return `${clock(ms)}.${String(hundredths % 100).padStart(2, '0')}`;
}

/** The time used on the board so far. */
export function elapsed(): number {
  const game = state.room?.game;
  if (!game) return 0;
  return game.status === 'playing' ? performance.now() - state.clockAt : game.elapsedMs;
}
