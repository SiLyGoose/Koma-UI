
/*
 * What this page and the Koma bot say to each other over Pinecraft's WebSocket. A copy of the bot's
 * src/web/pinecraft-protocol.ts (in the Koma repo): change both together.
 *
 * The bot holds the world. The page is sent the rows around the miner, one string per row and a
 * letter per block:
 *   .  open (sky, a cave, or dug)
 *   g d s b   grass, dirt, stone, bedrock the miner can see
 *   D S B     dirt, stone, bedrock not seen yet
 *   c i o x r e   coal, iron, gold, diamond, ruby, emerald
 * An ore is only sent once the miner can see it (next to open ground they can walk to).
 *
 *   page -> bot   hello    first message: the token from the link
 *                 move     one step; `seq` counts up from 1 with every move
 *   bot -> page   state    the world around the miner, after the page's move `seq` (0: not after one)
 *                 error    and the bot closes the connection
 */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type PinecraftOre = 'coal' | 'iron' | 'gold' | 'diamond' | 'ruby' | 'emerald';

export type ClientMessage = { t: 'hello'; token: string } | { t: 'move'; dir: Direction; seq: number };

export interface WorldState {
  /** The player's name. */
  player: string;
  /** Blocks across, rows in all, and rows of sky at the top. */
  width: number;
  depth: number;
  sky: number;
  /** The rows sent start at row `top`; one string per row, a letter per block (see viewRows). */
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
  /** Points this world's ores have paid, all told. */
  earned: number;
  /** What each ore pays, and how many rows down it starts to turn up. */
  values: Record<PinecraftOre, number>;
  from: Record<PinecraftOre, number>;
}

/** What the page's last move did. */
export type WorldEvent =
  | { kind: 'walk' | 'edge' | 'bedrock' | 'tired' }
  | { kind: 'dig'; ground: 'grass' | 'dirt' | 'stone'; ore: PinecraftOre | null; points: number };

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
