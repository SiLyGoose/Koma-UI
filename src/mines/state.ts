import type { Lobby, RunState } from './protocol';

/** What more than one part of the page needs to know. */
export const state = {
  lobby: null as Lobby | null,
  /** The round on the board: being played, or the last one played (shown until the next bet). */
  run: null as RunState | null,
  /** The message waiting for the bot's answer: a start, a pick (of `index`), or a cash out. */
  pending: null as { seq: number; index?: number | 'random' } | null,
  lastActivity: performance.now(),
  /** Whose game this page watches, once the bot has said. */
  watched: '',
  /** Counts the messages sent, so the bot's answers can be matched to them. */
  seq: 0,
};

export const playing = (): boolean => state.run?.status === 'playing';
