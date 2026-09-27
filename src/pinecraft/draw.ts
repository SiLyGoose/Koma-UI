import type { Direction, PinecraftOre, WorldMap, WorldState } from './protocol';
import { ORE_COLOR, texture, type BlockTexture } from './textures';

/*
 * Draws Pinecraft: the underground around the miner, in blocks. Ground dug out is a warm earth
 * floor; only the blocks next to it (the ones the miner can get at) are drawn as what they are, and
 * the rest are mystery blocks: the dirt's picture, nearly black.
 */

export const ORE_OF: Readonly<Record<string, PinecraftOre>> = { c: 'coal', i: 'iron', o: 'gold', x: 'diamond', r: 'ruby', e: 'emerald' };

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
  /** Where the miner is drawn, in blocks (fractions while moving), and which way they face. */
  miner: { x: number; y: number };
  facing: 1 | -1;
  /** The pickaxe swinging, since when (performance.now()), and which way. */
  swing: { since: number; dir: Direction } | null;
  /** A block being broken (it takes `takes` ms from `since`): it shakes and cracks, more and more. */
  digging: { x: number; y: number; since: number; takes: number } | null;
  particles: Particle[];
}

/** What block (x, y) is, as the page knows it (a letter, see protocol.ts): '?' if not seen, '#' past the edge. */
export function cellAt(scene: Pick<Scene, 'state' | 'known'>, x: number, y: number): string {
  const { size } = scene.state;
  if (x < 0 || y < 0 || x >= size || y >= size) return '#';
  return scene.known.get(y * size + x) ?? '?';
}

/** Letters of blocks that can be walked through, and of ones that can't be dug. */
export const isOpenCell = (c: string): boolean => c === '.';
export const isBedrock = (c: string): boolean => c === 'b' || c === '#';

function textureOf(c: string): BlockTexture {
  const ore = ORE_OF[c];
  if (ore) return ore;
  switch (c) {
    case 'd':
      return 'dirt';
    case 'b':
    case '#':
      return 'bedrock';
    default:
      return 'stone';
  }
}

/** The miner, standing in the block whose top left is (px, py), `s` wide. `swing` is how far through a swing of the pickaxe (null when still). */
function miner(g: CanvasRenderingContext2D, px: number, py: number, s: number, facing: 1 | -1, swing: number | null, dir: Direction | null, now: number): void {
  g.save();
  g.translate(px + s / 2, py + s);
  g.scale(facing * (s / 100), s / 100);
  // From here on: 100 units a block, x 0 in the middle, y 0 at the feet, facing right.
  const bob = swing === null ? Math.sin(now / 400) * 1 : 0;
  // Boots and legs.
  g.fillStyle = '#3b2a1c';
  g.fillRect(-18, -8, 15, 8);
  g.fillRect(4, -8, 15, 8);
  g.fillStyle = '#2d4f9e';
  g.fillRect(-16, -30, 12, 23);
  g.fillRect(5, -30, 12, 23);
  // Shirt and overalls.
  g.fillStyle = '#d9772b';
  g.beginPath();
  g.roundRect(-20, -62 + bob, 40, 36, 8);
  g.fill();
  g.fillStyle = '#3563c7';
  g.fillRect(-15, -48 + bob, 30, 20);
  g.fillRect(-15, -60 + bob, 5, 14);
  g.fillRect(10, -60 + bob, 5, 14);
  // Head.
  g.fillStyle = '#f0c29a';
  g.beginPath();
  g.arc(0, -74 + bob, 15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2a1d14';
  g.beginPath();
  g.arc(6, -75 + bob, 2.4, 0, Math.PI * 2);
  g.fill();
  // Helmet, with its lamp at the front.
  g.fillStyle = '#f5c542';
  g.beginPath();
  g.arc(0, -79 + bob, 17, Math.PI, 0);
  g.fill();
  g.fillStyle = '#d19d1c';
  g.fillRect(-19, -81 + bob, 38, 5);
  g.fillStyle = '#fff6c8';
  g.beginPath();
  g.arc(13, -88 + bob, 5, 0, Math.PI * 2);
  g.fill();

  // The pickaxe, held at the shoulder: raised behind while still, brought down in front in a swing.
  // Digging up or down swings it that way instead.
  const rest = -2.2;
  const strike = dir === 'up' ? -1.2 : dir === 'down' ? 0.9 : 0.25;
  const t = swing === null ? 0 : Math.sin(Math.min(1, swing) * Math.PI);
  const angle = rest + (strike - rest) * t;
  g.save();
  g.translate(8, -52 + bob);
  g.rotate(angle);
  g.fillStyle = '#7a5230';
  g.fillRect(-3, -3, 46, 6);
  g.fillStyle = '#9aa3ad';
  g.strokeStyle = '#4f565e';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(40, -22);
  g.quadraticCurveTo(54, 0, 40, 22);
  g.quadraticCurveTo(47, 0, 40, -22);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  // The hand on the handle.
  g.fillStyle = '#f0c29a';
  g.beginPath();
  g.arc(8 + Math.cos(angle) * 12, -52 + bob + Math.sin(angle) * 12, 6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** The same cracks on every block, in the order they appear: each a line out from the middle, then a bend. */
const CRACKS = Array.from({ length: 9 }, (_, k) => {
  const angle = k * 2.39996 + 0.5;
  const reach = 0.3 + ((k * 7) % 5) * 0.035;
  return { angle, reach, bend: angle + (k % 2 ? 0.5 : -0.5) };
});

/**
 * Cracks over the block at (px, py), `s` wide, `progress` of the way (0 to 1) to breaking, like
 * Minecraft's: more of them, and longer, as the pickaxe works, and the block darkens.
 */
function cracks(g: CanvasRenderingContext2D, px: number, py: number, s: number, progress: number): void {
  g.fillStyle = `rgba(0, 0, 0, ${0.3 * progress})`;
  g.fillRect(px, py, s + 0.5, s + 0.5);
  g.save();
  g.beginPath();
  g.rect(px, py, s, s);
  g.clip();
  g.strokeStyle = 'rgba(15, 10, 8, 0.85)';
  g.lineWidth = Math.max(1.5, s * 0.045);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const cx = px + s / 2;
  const cy = py + s / 2;
  const shown = progress * CRACKS.length;
  CRACKS.forEach(({ angle, reach, bend }, k) => {
    const grow = Math.max(0, Math.min(1, shown - k));
    if (grow <= 0) return;
    const mx = cx + Math.cos(angle) * s * reach * 0.55 * grow;
    const my = cy + Math.sin(angle) * s * reach * 0.55 * grow;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(mx, my);
    g.lineTo(mx + Math.cos(bend) * s * reach * 0.5 * grow, my + Math.sin(bend) * s * reach * 0.5 * grow);
    g.stroke();
  });
  g.restore();
}

/** Draws the scene on `g`, which is `w` by `h` CSS pixels, with blocks `s` pixels wide. */
export function drawScene(g: CanvasRenderingContext2D, scene: Scene, w: number, h: number, s: number, now: number): void {
  const { cam } = scene;
  g.fillStyle = '#0d0e11';
  g.fillRect(0, 0, w, h);

  const x0 = Math.floor(cam.x);
  const y0 = Math.floor(cam.y);
  const cols = Math.ceil(w / s) + 1;
  const rows = Math.ceil(h / s) + 1;
  // The dirt's picture: faintly in the floor, and darkened for blocks not seen yet.
  const floor = texture('dirt');

  for (let y = y0; y < y0 + rows; y++) {
    for (let x = x0; x < x0 + cols; x++) {
      const c = cellAt(scene, x, y);
      let px = (x - cam.x) * s;
      let py = (y - cam.y) * s;
      if (c === '?') {
        // Not seen yet: a mystery block, the dirt's picture made nearly black.
        if (floor) g.drawImage(floor, px, py, s + 0.5, s + 0.5);
        g.fillStyle = 'rgba(12, 12, 15, 0.84)';
        g.fillRect(px, py, s + 0.5, s + 0.5);
        continue;
      }
      if (isOpenCell(c)) {
        // Dug out: warm earth, with a hint of the dirt's grain.
        g.fillStyle = '#b3682f';
        g.fillRect(px, py, s + 0.5, s + 0.5);
        if (floor) {
          g.globalAlpha = 0.1;
          g.drawImage(floor, px, py, s + 0.5, s + 0.5);
          g.globalAlpha = 1;
        }
        continue;
      }
      const dug = scene.digging;
      if (dug && dug.x === x && dug.y === y) {
        px += Math.sin(now / 22) * s * 0.03;
        py += Math.cos(now / 29) * s * 0.02;
      }
      const tex = texture(textureOf(c));
      if (tex) g.drawImage(tex, px, py, s + 0.5, s + 0.5);
      if (dug && dug.x === x && dug.y === y) cracks(g, px, py, s, Math.min(1, (now - dug.since) / dug.takes));
    }
  }

  // Chips of rock and sparks.
  for (const p of scene.particles) {
    const age = (now - p.born) / p.life;
    if (age >= 1) continue;
    g.globalAlpha = 1 - age;
    g.fillStyle = p.color;
    g.fillRect((p.x - cam.x) * s - (p.size * s) / 2, (p.y - cam.y) * s - (p.size * s) / 2, p.size * s, p.size * s);
  }
  g.globalAlpha = 1;

  // A swing takes 260 ms; while waiting for the bot to answer a dig, it keeps swinging.
  const swingT = scene.swing ? (now - scene.swing.since) / 260 : null;
  const phase = swingT === null ? null : scene.digging ? swingT % 1 : swingT < 1 ? swingT : null;
  miner(g, (scene.miner.x - cam.x) * s, (scene.miner.y - cam.y) * s, s, scene.facing, phase, scene.swing?.dir ?? null, now);
}

/** Adds the chips a dug block throws off (and sparks, for an ore). */
export function burst(scene: Scene, x: number, y: number, ground: 'dirt' | 'stone', ore: PinecraftOre | null, now: number): void {
  const chip = ground === 'stone' ? ['#77787b', '#5a5b5f', '#8d8e91'] : ['#6b4f35', '#533c28', '#7d5d40'];
  const add = (color: string, speed: number, size: number, life: number): void => {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.5 + Math.random());
    scene.particles.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, size, color, born: now, life });
  };
  for (let k = 0; k < 12; k++) add(chip[k % chip.length] as string, 3, 0.09 + Math.random() * 0.06, 500 + Math.random() * 250);
  if (ore) {
    const { gem, shine } = ORE_COLOR[ore];
    for (let k = 0; k < 14; k++) add(k % 2 ? gem : shine, 4.5, 0.07 + Math.random() * 0.05, 700 + Math.random() * 300);
  }
}

/** Moves the particles on by `dt` ms (they spread out and slow down), and forgets the ones that are gone. */
export function stepParticles(scene: Scene, dt: number, now: number): void {
  const t = dt / 1000;
  const drag = Math.exp(-4 * t);
  scene.particles = scene.particles.filter((p) => now - p.born < p.life);
  for (const p of scene.particles) {
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * t;
    p.y += p.vy * t;
  }
}

/** The map's colour for each letter (see protocol.ts); blocks not seen yet aren't drawn. */
const MAP_COLOR: Readonly<Record<string, string>> = {
  '.': '#b3682f',
  d: '#5b3f2b',
  s: '#6d7278',
  b: '#2c3642',
  ...Object.fromEntries(Object.entries(ORE_OF).map(([letter, ore]) => [letter, ORE_COLOR[ore].gem])),
};

/**
 * Draws the map on `g` (`w` by `h` CSS pixels): everything uncovered, a square a block, as big as
 * fits (up to 16 px a block), in the middle. The start (0,0) is outlined, and the miner, at `you`,
 * is a red square.
 */
export function drawMap(g: CanvasRenderingContext2D, map: WorldMap, w: number, h: number, you: { x: number; y: number }, spawn: { x: number; y: number }): void {
  g.fillStyle = '#1f1f1f';
  g.fillRect(0, 0, w, h);
  const cols = map.rows[0]?.length ?? 0;
  const rows = map.rows.length;
  if (cols === 0 || rows === 0) return;
  const pad = 40;
  const cell = Math.max(2, Math.min(16, Math.floor(Math.min((w - 2 * pad) / cols, (h - 2 * pad) / rows))));
  const ox = Math.round((w - cols * cell) / 2);
  const oy = Math.round((h - rows * cell) / 2);
  map.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = MAP_COLOR[row[x] as string];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  });
  const at = (p: { x: number; y: number }) => ({ x: ox + (p.x - map.left) * cell, y: oy + (p.y - map.top) * cell });
  const start = at(spawn);
  g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  g.lineWidth = 1;
  g.strokeRect(start.x - cell + 0.5, start.y - cell + 0.5, cell * 3 - 1, cell * 3 - 1);
  const me = at(you);
  const r = Math.max(2, cell * 0.35);
  g.fillStyle = '#ff3b3b';
  g.strokeStyle = '#fff';
  g.lineWidth = Math.max(1, cell * 0.12);
  g.beginPath();
  g.rect(me.x + cell / 2 - r, me.y + cell / 2 - r, r * 2, r * 2);
  g.fill();
  g.stroke();
}
