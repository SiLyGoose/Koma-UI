import type { RaidAction, RaidView } from './protocol';

/** What more than one part of the page needs to know: the raid as last sent, and the picks under way. */
export const state = {
  view: null as RaidView | null,
  /** Heal's "who?" is open (for this round). */
  healOpenRound: null as number | null,
  /**
   * What they picked this turn, to play as it lands. Kept from their click (once the bot takes it) as
   * well as from the raid: with everyone in, the turn closes at once, in the same raid it's sent next.
   */
  lastPick: null as RaidAction | null,
  /** The pick on its way to the bot. */
  pendingPick: null as RaidAction | null,
  /** The lobby's countdown, in the party screen's status line (tick() keeps it going). */
  lobbyTimer: null as HTMLElement | null,
};

/** A raider's name, "(you)" after theirs. */
export const nameOf = (userId: string): string => (state.view?.names[userId] ?? 'Someone') + (userId === state.view?.you ? ' (you)' : '');
