import type { MineOre, RunState } from './protocol';

/*
 * Draws the mine field on a canvas, the same look as the picture the bot draws in Discord: rough
 * stone for hidden tiles, dark floor for dug ones with what was in them, and the miner. Once the
 * run is over every tile is shown, the ones never dug a little dimmed.
 */

export const TILE = 72;
export const GAP = 4;
export const SIDE = 14;

/** The canvas size, in CSS pixels, for a field of `size` by `size` tiles. */
export const boardSize = (size: number): number => size * TILE + (size - 1) * GAP + 2 * SIDE;

/** Where tile `i` starts (its top left corner). */
export const tileOrigin = (i: number, size: number): { x: number; y: number } => ({
  x: SIDE + (i % size) * (TILE + GAP),
  y: SIDE + Math.floor(i / size) * (TILE + GAP),
});

type Rgb = readonly [number, number, number];
const css = ([r, g, b]: Rgb, alpha = 1): string => `rgba(${r}, ${g}, ${b}, ${alpha})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const BACKGROUND: Rgb = [32, 34, 38];
const LINE: Rgb = [30, 31, 34];
const STONE: Rgb = [104, 92, 80];
const STONE_LIGHT: Rgb = [132, 118, 102];
const STONE_DARK: Rgb = [84, 74, 64];
const FLOOR: Rgb = [70, 61, 53];

export const ORE_COLOR: Readonly<Record<MineOre, { body: Rgb; shine: Rgb }>> = {
  coal: { body: [20, 20, 24], shine: [120, 120, 130] },
  iron: { body: [190, 150, 118], shine: [236, 214, 196] },
  gold: { body: [236, 180, 40], shine: [255, 236, 150] },
  diamond: { body: [90, 210, 236], shine: [220, 250, 255] },
};

/** A number from 0 to 1 that is always the same for the same inputs (for the flecks in the stone). */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** What is going on besides the state: where the miner is drawn (it slides between tiles), and the effects. */
export interface Scene {
  state: RunState;
  /** The miner's tile position, in tiles (fractions while sliding). */
  miner: { col: number; row: number };
  /** A tile being dug, waiting for the bot's answer: it shakes a little. */
  digging: number | null;
  /** When the dynamite went off (performance.now()), for the blast. */
  blastAt: number | null;
}

export function drawScene(g: CanvasRenderingContext2D, scene: Scene, now: number): void {
  const { state } = scene;
  const { size } = state;
  const over = state.status !== 'digging';
  const full = boardSize(size);
  g.fillStyle = css(BACKGROUND);
  g.fillRect(0, 0, full, full);

  const circle = (cx: number, cy: number, r: number, color: string): void => {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
  };
  const polygon = (points: readonly (readonly [number, number])[], color: string): void => {
    g.beginPath();
    points.forEach(([x, y], k) => (k === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.fillStyle = color;
    g.fill();
  };

  for (let i = 0; i < size * size; i++) {
    let { x, y } = tileOrigin(i, size);
    if (scene.digging === i) {
      x += Math.sin(now / 25) * 2;
      y += Math.cos(now / 31) * 1.5;
    }
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    const tile = state.tiles[i] ?? null;
    const dug = state.dug[i] === true;
    const dim = (color: Rgb): string => css(dug ? color : mix(color, LINE, 0.45));

    if (dug) {
      g.fillStyle = css(FLOOR);
      g.fillRect(x, y, TILE, TILE);
    } else {
      g.fillStyle = dim(STONE);
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = dim(STONE_LIGHT);
      g.fillRect(x, y, TILE, 5);
      g.fillStyle = dim(STONE_DARK);
      g.fillRect(x, y + TILE - 5, TILE, 5);
      for (let k = 0; k < 4; k++) circle(x + 10 + hash(i, k, 1) * (TILE - 20), y + 12 + hash(i, k, 2) * (TILE - 24), 2.5, dim(STONE_DARK));
      if (!over) continue;
    }

    if (tile === 'dynamite') {
      const blew = state.status === 'boom' && i === state.pos;
      if (blew) {
        const since = scene.blastAt === null ? 1 : Math.min(1, (now - scene.blastAt) / 350);
        const grow = 0.4 + 0.6 * since;
        const star = (r1: number, r2: number): [number, number][] =>
          Array.from({ length: 16 }, (_, k) => {
            const angle = (k * Math.PI) / 8;
            const r = (k % 2 === 0 ? r1 : r2) * grow;
            return [cx + Math.sin(angle) * r, cy - Math.cos(angle) * r];
          });
        polygon(star(34, 16), 'rgb(237, 110, 50)');
        polygon(star(20, 10), 'rgb(255, 214, 90)');
      } else {
        g.fillStyle = dim([200, 48, 48]);
        g.fillRect(cx - 16, cy - 8, 32, 22);
        g.fillStyle = dim([150, 30, 30]);
        g.fillRect(cx - 16, cy - 2, 32, 4);
        g.fillStyle = dim([220, 220, 220]);
        g.fillRect(cx - 1.5, cy - 20, 3, 12);
        circle(cx, cy - 21, 4, dim([255, 200, 60]));
      }
    } else if (tile !== null && tile !== 'rock') {
      const { body, shine } = ORE_COLOR[tile];
      if (tile === 'diamond') {
        polygon([[cx, cy - 20], [cx + 18, cy - 4], [cx, cy + 20], [cx - 18, cy - 4]], dim(body));
        polygon([[cx, cy - 20], [cx + 8, cy - 4], [cx, cy + 4], [cx - 8, cy - 4]], dim(shine));
      } else {
        for (const [dx, dy, r] of [[-9, 4, 11], [9, 6, 10], [0, -8, 11]] as const) {
          circle(cx + dx, cy + dy, r, dim(body));
          circle(cx + dx - r / 3, cy + dy - r / 3, r / 3, dim(shine));
        }
      }
    }
  }

  // The miner, unless the dynamite under them went off: a face under a yellow helmet with a lamp.
  if (state.status !== 'boom') {
    const x = SIDE + scene.miner.col * (TILE + GAP) + TILE / 2;
    const y = SIDE + scene.miner.row * (TILE + GAP) + TILE / 2 + 4;
    circle(x, y, 20, '#fff');
    circle(x, y, 17, 'rgb(236, 196, 160)');
    polygon(
      Array.from({ length: 13 }, (_, k) => [x - Math.cos((k * Math.PI) / 12) * 21, y - 4 - Math.sin((k * Math.PI) / 12) * 19] as [number, number]),
      'rgb(245, 197, 66)',
    );
    g.fillStyle = 'rgb(220, 170, 40)';
    g.fillRect(x - 23, y - 6, 46, 4);
    circle(x, y - 14, 4.5, 'rgb(255, 255, 230)');
    circle(x - 6, y + 5, 2.2, css(LINE));
    circle(x + 6, y + 5, 2.2, css(LINE));
  }
}
