import type { Direction, PinecraftOre, WorldState } from '../protocol';

/** What each ore's letter is (see ../protocol.ts). */
export const ORE_OF: Readonly<Record<string, PinecraftOre>> = { c: 'coal', i: 'iron', o: 'gold', x: 'diamond', r: 'ruby', e: 'emerald', a: 'amethyst' };

/** A spark or chip of rock flying off a block being dug. Positions in blocks, speeds in blocks a second. */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  born: number;
  life: number;
}

export interface Scene {
  state: WorldState;
  /** Every block seen, by index (y * size + x): the page keeps them, so ground scrolled past stays drawn. */
  known: Map<number, string>;
  /** The top left of the view, in blocks. */
  cam: { x: number; y: number };
  /** Where the character is drawn, in blocks (fractions while moving), and which way they face. */
  character: { x: number; y: number };
  facing: 1 | -1;
  /** The pickaxe swinging, since when (performance.now()), and which way. */
  swing: { since: number; dir: Direction } | null;
  /** A block being broken (it takes `takes` ms from `since`): it cracks, more and more. */
  digging: { x: number; y: number; since: number; takes: number } | null;
  particles: Particle[];
  /** How far under the starting room to draw how to play (the keys), in blocks. */
  keysGap: number;
  /** When how to play starts fading away (performance.now()), once the character has moved; null before. */
  keysGoneAt: number | null;
}

/** What block (x, y) is, as the page knows it (a letter, see ../protocol.ts): '?' if not seen, '#' past the edge. */
export function cellAt(scene: Pick<Scene, 'state' | 'known'>, x: number, y: number): string {
  const { size } = scene.state;
  if (x < 0 || y < 0 || x >= size || y >= size) return '#';
  return scene.known.get(y * size + x) ?? '?';
}

/** Letters of blocks that can be walked through, and of ones that can't be dug. */
export const isOpenCell = (c: string): boolean => c === '.';
export const isBedrock = (c: string): boolean => c === 'b' || c === '#';
