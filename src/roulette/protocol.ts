/*
 * What this page and the bot say to each other over the WebSocket: the shared tables' messages
 * (../table/protocol.ts), with roulette's spots and round. A copy of the bot's
 * src/web/roulette/protocol.ts (the Koma repo): change both together.
 *
 * A spot is an outside bet ('red', 'black', 'odd', 'even', 'low', 'high', 'dozen1'-'dozen3',
 * 'column1'-'column3'), or the numbers an inside bet covers, smallest first, joined with "-"
 * ("17", "00", "17-20", "0-00", "16-17-18", "00-2-3", "16-17-19-20", "13-14-15-16-17-18",
 * "0-00-1-2-3"). 0 comes first, then 00.
 */

import type * as table from '../table/protocol';

export type Spot = string;
export type Color = 'red' | 'black' | 'green';
/** A pocket on the wheel: 0 to 36, or '00'. */
export type Pocket = number | '00';

export interface RouletteRoundView {
  number: Pocket;
  color: Color;
  /** The table's last numbers, this one first. */
  recent: Pocket[];
}

export type RoundView = table.RoundOf<RouletteRoundView>;
