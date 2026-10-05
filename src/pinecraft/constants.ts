import type { Direction } from './protocol';

/** Blocks across the view, when the page's styles don't say (--cols on the view). */
export const VIEW_COLS = 8;
/** A step every this many ms while a direction is held. */
export const STEP_MS = 140;
/** A dig shows at least this much swing, however fast the bot answers. */
export const MIN_DIG_MS = 200;
/** How long a block takes to break when the bot doesn't say (an older bot). */
export const DEFAULT_BREAK_MS = 400;
/** A pickaxe swing (as drawn), and how far into one it strikes. */
export const SWING_MS = 260;
export const STRIKE_MS = 130;
/** Where a step each way goes, in blocks. */
export const STEP: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
