import type { GameSocket } from '../shared/game';
import { sumBets } from './format';
import type { TableUi } from './panel';
import type { Bets, ClientMessage, SeatView, TableState } from './protocol';
import type { TableGame } from './types';

/** Everything the table knows: its game, its elements, the table as the bot said, and this page's chips. */
export interface TableContext<S extends string, R, X> {
  game: TableGame<S, R, X>;
  ui: TableUi;
  /** Watching someone play (nothing here can be pressed). */
  watching: boolean;
  /** Whose table this page watches, once the bot has said. */
  watched: string;
  socket: GameSocket<ClientMessage<S>> | null;
  /** The table as the bot last said. */
  state: TableState<S, R, X> | null;
  /** This page's chips: what the bot last confirmed, changed straight away as chips go down (and sent). */
  bets: Bets<S>;
  history: { spot: S; amount: number }[];
  /** The chip picked in the rack (tapping a spot puts one of these on it). */
  selected: number;
  /** When the phase ends, on this page's clock. */
  deadline: number;
  /** The betting time as a whole, for the bar: the most time left seen in this betting phase. */
  bettingWhole: number;
  /** The round shown on the felt (its number), and whether it is still being played out. */
  shownRound: number;
  dealingOut: boolean;
  rackBuilt: boolean;
  /** A change of chips was refused: the table that follows has the chips that are really down. */
  adoptBets: boolean;
  /** Counts the changes of chips sent, so the bot can tell which it last saw. */
  seq: number;
  /**
   * Counts up to cancel a round being played out: a page in a background tab has its timers slowed,
   * so the next round's betting can start before it's all out.
   */
  playing: number;
}

export function mySeat<S extends string, R, X>(ctx: TableContext<S, R, X>): SeatView<S> | undefined {
  return ctx.state?.seats.find((s) => s.userId === ctx.state?.you);
}

/** How much this page has down (in `b`, or on the table now). */
export const onTable = <S extends string, R, X>(ctx: TableContext<S, R, X>, b: Bets<S> = ctx.bets): number => sumBets(b);

export const balance = <S extends string, R, X>(ctx: TableContext<S, R, X>): number | null => mySeat(ctx)?.balance ?? null;

/** Chips can't be touched: watching, not seated yet, or the round isn't taking bets. */
export const busy = <S extends string, R, X>(ctx: TableContext<S, R, X>): boolean => ctx.watching || !ctx.state || !mySeat(ctx) || ctx.state.phase !== 'betting';

/** The round is all out on the felt, and how everyone did shows. */
export const showingResults = <S extends string, R, X>(ctx: TableContext<S, R, X>): boolean => !ctx.dealingOut && ctx.state?.phase === 'dealing';

export function showError<S extends string, R, X>(ctx: TableContext<S, R, X>, text: string | null): void {
  ctx.ui.error.hidden = text === null;
  ctx.ui.error.textContent = text ?? '';
}
