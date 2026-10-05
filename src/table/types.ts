import type { Outcome, RoundOf, SeatView, TableState } from './protocol';

/** One player's chips on a spot, as a game draws them. */
export interface Pile<S extends string = string> {
  seat: SeatView<S>;
  amount: number;
  /** This page's (the one being watched, when watching). */
  mine: boolean;
  /** How it came out, once the round is all shown. */
  outcome?: Outcome;
  /** Their chips couldn't be taken when the round was dealt. */
  refused: boolean;
}

export interface TableGame<S extends string, R, X = unknown> {
  /** Its name in a sentence ("baccarat") and as a title ("Baccarat"). */
  name: string;
  title: string;
  /** What its settings in the browser are kept under (the sound switch, the chip picked). */
  key: string;
  /** How dealing is put: the button ("Deal"), in a sentence ("deal"), while it happens ("Dealing…"), before ("dealing in"), and what the button does alone and with others. */
  words: { button: string; verb: string; doing: string; soon: string; alone: string; together: string };
  /** The spots, by name: elements with `data-spot`. */
  spots: ReadonlyMap<S, HTMLElement>;
  /** Draws everyone's chips on a spot (renderPiles when left out). */
  renderSpot?: (el: HTMLElement, piles: Pile<S>[], chips: readonly number[]) => void;
  /** Takes the last round off the felt. */
  clear(): void;
  /** Puts `round` on the felt at once (joining mid-round, or the last round while the next takes bets). */
  show(round: RoundOf<R>): void;
  /** Plays `round` out on the felt (deals the cards, spins the wheel). Stops when `current` turns false. */
  animate(round: RoundOf<R>, current: () => boolean): Promise<void>;
  /** Shows who won `round`, once it's all out. */
  reveal(round: RoundOf<R>): void;
  /** How `round` went, in a few words, like "8 to 6 · Natural 8". */
  describe(round: RoundOf<R>): string;
  /** Anything else of the game's to draw when the table changes (like what each spot pays). */
  render?(state: TableState<S, R, X>): void;
}
