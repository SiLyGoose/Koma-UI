import type { startLeaderboard } from './hud';
import type { Scene } from './draw';
import type { Direction, WorldMap } from './protocol';
import type { Material } from './sfx';

/** What more than one part of the page needs to know: the mine as drawn, and the move under way. */
export const state = {
  scene: null as Scene | null,
  /** Energy as the page counts it: the bot's last word, plus what has come back since. */
  energy: { count: 0, max: 0, nextAt: null as number | null, every: 0 },
  /** The view's size in px, and a block's. */
  size: { w: 0, h: 0, block: 0 },
  /** Whose world this page watches, once the bot has said. */
  watched: '',
  /** Counts the moves sent, so the bot's answers can be matched to them. */
  seq: 0,
  /** The dig waiting for the bot's answer: its seq, the block, and when the swing started. */
  pendingDig: null as { seq: number; x: number; y: number; since: number } | null,
  /** Where the character is headed, in blocks (they slide there). */
  target: { x: 0, y: 0 },
  lastStep: 0,
  /**
   * The block being broken: which way, where, since when, and how long it takes; what it sounds like,
   * and when the pickaxe next hits it.
   */
  breaking: null as { dir: Direction; x: number; y: number; since: number; takes: number; material: Material; nextHit: number } | null,
  /** The block last refused (bedrock, or no energy for it): holding against it says so only once. */
  refused: null as string | null,
  /** How to play, shown over the mine until the first move. */
  startTip: null as string | null,
  mapOpen: false,
  /** The map the bot sent last (asked for each time the map is opened). */
  worldMap: null as WorldMap | null,
  /** Where the character was when the page opened: how to play goes 5 seconds after they first leave it. */
  keysFrom: { x: 0, y: 0 },
  /** The 🏆 leaderboard (once the page has a link). */
  leaderboard: null as ReturnType<typeof startLeaderboard> | null,
};

/** The directions held down, the latest last: holding one keeps moving that way. */
export const held: Direction[] = [];
