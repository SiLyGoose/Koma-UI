import type { GameSocket } from '../shared/game';
import type { ClientMessage, MinesweeperLevel, RoomState } from './protocol';

export const LEVEL_NAMES: Record<MinesweeperLevel, string> = { easy: 'Beginner', medium: 'Intermediate', hard: 'Expert' };

/** What more than one part of the page needs to know. */
export const state = {
  socket: null as GameSocket<ClientMessage> | null,
  /** The room as the bot last said. */
  room: null as RoomState | null,
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

/** The time used on the board so far. */
export function elapsed(): number {
  const game = state.room?.game;
  if (!game) return 0;
  return game.status === 'playing' ? performance.now() - state.clockAt : game.elapsedMs;
}
