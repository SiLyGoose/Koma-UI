
/*
 * What this page and the Koma bot say to each other over Pinecraft's WebSocket. A copy of the bot's
 * src/web/pinecraft-protocol.ts (in the Koma repo): change both together.
 *
 * The bot holds the world. The page is sent the blocks around the miner, one string per row and a
 * letter per block:
 *   .  open (the starting room, or dug)
 *   d s b   dirt, stone, bedrock
 *   c i o x e r   coal, iron, gold, diamond, emerald, ruby
 *   ?  not seen yet
 * A block is only sent once the miner can see it (next to open ground they can walk to).
 *
 *   page -> bot   hello    first message: the token from the link
 *                 mine     starts breaking the block that way (no answer)
 *                 move     one step; `seq` counts up from 1 with every move. Into a block, it finishes
 *                          breaking it: the bot holds the move until the block's break time has
 *                          passed since its `mine` (or since now, without one)
 *   bot -> page   state    the world around the miner, after the page's move `seq` (0: not after one)
 *                 error    and the bot closes the connection
 */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type PinecraftOre = 'coal' | 'iron' | 'gold' | 'diamond' | 'emerald' | 'ruby';

export type ClientMessage = { t: 'hello'; token: string } | { t: 'mine'; dir: Direction } | { t: 'move'; dir: Direction; seq: number };

export interface WorldState {
  /** The player's name. */
  player: string;
  /** The world is size by size blocks. */
  size: number;
  /** The blocks around the miner: one string per row, a letter per block, from block (left, top). */
  left: number;
  top: number;
  rows: string[];
  x: number;
  y: number;
  energy: number;
  maxEnergy: number;
  /** Milliseconds until the next energy comes back (null when full), and for each one after it. */
  nextEnergyMs: number | null;
  energyMs: number;
  /** The player's points (null if unknown). */
  balance: number | null;
  /** Points this world's ores have paid, all told, and blocks dug. */
  earned: number;
  dug: number;
  /** What each ore pays. */
  values: Record<PinecraftOre, number>;
  /** How long each block takes to break, in ms. */
  breakMs: Record<'dirt' | 'stone' | PinecraftOre, number>;
}

/** What the page's last move did. */
export type WorldEvent =
  | { kind: 'walk' | 'edge' | 'bedrock' | 'tired' }
  | { kind: 'dig'; ground: 'dirt' | 'stone'; ore: PinecraftOre | null; points: number };

export type ErrorCode =
  /** The link's token is wrong or too old (or the bot restarted since). */
  | 'bad_token'
  /** The page was opened somewhere else (another tab): only one plays at a time. */
  | 'replaced'
  /** A message that isn't one of the above, or too many of them. */
  | 'bad_message'
  /** The world couldn't be loaded or saved. */
  | 'failed';

export type ServerMessage = { t: 'state'; seq: number; state: WorldState; event?: WorldEvent } | { t: 'error'; code: ErrorCode };
