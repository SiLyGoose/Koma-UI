import type { Direction, PinecraftOre, WorldState } from './protocol';
import { ORE_COLOR, texture, type BlockTexture } from './textures';

/*
 * Draws Pinecraft: a side-on slice of the world around the miner. Sky with pine trees on top, then
 * the ground in blocks; open ground underground is dark cave wall. Blocks the miner hasn't seen yet
 * are dimmed, and the deeper the miner goes, the darker it gets beyond their helmet lamp.
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
  /** Every row seen, by row: the page keeps them, so ground scrolled past stays drawn. */
  known: Map<number, string>;
  /** The top left of the view, in blocks. */
  cam: { x: number; y: number };
  /** Where the miner is drawn, in blocks (fractions while moving), and which way they face. */
  miner: { x: number; y: number };
  facing: 1 | -1;
  /** The pickaxe swinging, since when (performance.now()), and which way. */
  swing: { since: number; dir: Direction } | null;
  /** A block being dug, waiting for the bot: it shakes and cracks. */
  digging: { x: number; y: number; since: number } | null;
  particles: Particle[];
}

/** What block (x, y) is, as the page knows it (a letter, see protocol.ts). */
export function cellAt(scene: Pick<Scene, 'state' | 'known'>, x: number, y: number): string {
  const { state } = scene;
  if (y < state.sky) return '.';
  if (x < 0 || x >= state.width || y >= state.depth) return 'B';
  const known = scene.known.get(y)?.[x];
  if (known) return known;
  if (y === state.sky) return 'g';
  if (y === state.depth - 1) return 'B';
  return y - state.sky <= 8 ? 'D' : 'S';
}

/** Letters of blocks that can be walked through, and of ones that can't be dug. */
export const isOpenCell = (c: string): boolean => c === '.';
export const isBedrock = (c: string): boolean => c === 'b' || c === 'B';

function textureOf(c: string): BlockTexture {
  const ore = ORE_OF[c];
  if (ore) return ore;
  switch (c.toLowerCase()) {
    case 'g':
      return 'grass';
    case 'd':
      return 'dirt';
    case 'b':
      return 'bedrock';
    default:
      return 'stone';
  }
}

/** A number from 0 to 1 that is always the same for the same inputs. */
function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A pine tree standing on the grass, `x` blocks across (its trunk's middle), `ground` its foot, `s` a block's size. */
function pine(g: CanvasRenderingContext2D, x: number, ground: number, s: number, tall: number): void {
  g.fillStyle = '#5a3d25';
  g.fillRect(x - s * 0.1, ground - s * 0.55, s * 0.2, s * 0.55);
  const tiers = 3;
  for (let k = 0; k < tiers; k++) {
    const w = s * (0.95 - k * 0.22) * tall;
    const base = ground - s * 0.4 - k * s * 0.42 * tall;
    const top = base - s * 0.75 * tall;
    g.beginPath();
    g.moveTo(x - w / 2, base);
    g.lineTo(x + w / 2, base);
    g.lineTo(x, top);
    g.closePath();
    g.fillStyle = k % 2 === 0 ? '#2f7a45' : '#3a8f52';
    g.fill();
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

/** Draws the scene on `g`, which is `w` by `h` CSS pixels, with blocks `s` pixels wide. */
export function drawScene(g: CanvasRenderingContext2D, scene: Scene, w: number, h: number, s: number, now: number): void {
  const { state, cam } = scene;
  const surface = (state.sky - cam.y) * s;

  // The sky, down to the grass.
  const sky = g.createLinearGradient(0, surface - 6 * s, 0, surface);
  sky.addColorStop(0, '#6fb6ea');
  sky.addColorStop(1, '#bfe3f7');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, Math.max(0, surface));
  g.fillStyle = '#1a1411';
  g.fillRect(0, Math.max(0, surface), w, h);

  const x0 = Math.floor(cam.x);
  const y0 = Math.floor(cam.y);
  const cols = Math.ceil(w / s) + 1;
  const rows = Math.ceil(h / s) + 1;

  // Pine trees along the surface, behind everything.
  if (surface > 0) {
    for (let x = x0 - 1; x < x0 + cols + 1; x++) {
      if (x < 0 || x >= state.width || hash(x, 0, 7) > 0.4) continue;
      pine(g, (x + 0.5 - cam.x) * s + (hash(x, 1, 7) - 0.5) * s * 0.4, surface, s, 0.8 + hash(x, 2, 7) * 0.5);
    }
  }

  for (let y = y0; y < y0 + rows; y++) {
    for (let x = x0; x < x0 + cols; x++) {
      const c = cellAt(scene, x, y);
      let px = (x - cam.x) * s;
      let py = (y - cam.y) * s;
      if (isOpenCell(c)) {
        if (y < state.sky) continue;
        // Cave wall: the ground's picture, far darker.
        const wall = texture(y - state.sky <= 8 ? 'dirt' : 'stone');
        if (wall) {
          g.globalAlpha = 0.28;
          g.drawImage(wall, px, py, s + 0.5, s + 0.5);
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
      // Not seen yet: dimmed.
      if (c !== c.toLowerCase()) {
        g.fillStyle = 'rgba(8, 6, 5, 0.38)';
        g.fillRect(px, py, s + 0.5, s + 0.5);
      }
      if (dug && dug.x === x && dug.y === y) {
        // Cracks, growing as the pickaxe works.
        const k = Math.min(1, (now - dug.since) / 250);
        g.strokeStyle = 'rgba(20, 14, 10, 0.75)';
        g.lineWidth = Math.max(1.5, s * 0.04);
        g.lineCap = 'round';
        g.beginPath();
        const cx = px + s / 2;
        const cy = py + s / 2;
        for (let a = 0; a < 5; a++) {
          const angle = a * 1.3 + 0.4;
          g.moveTo(cx, cy);
          g.lineTo(cx + Math.cos(angle) * s * 0.42 * k, cy + Math.sin(angle) * s * 0.42 * k);
        }
        g.stroke();
      }
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

  // Underground it gets darker the deeper the miner is, except around their lamp.
  const depth = scene.miner.y - state.sky;
  const dark = Math.max(0, Math.min(0.82, (depth - 1) / 14));
  if (dark > 0) {
    const lx = (scene.miner.x + 0.5 - cam.x) * s;
    const ly = (scene.miner.y + 0.2 - cam.y) * s;
    const light = g.createRadialGradient(lx, ly, s * 1.2, lx, ly, s * 4.2);
    light.addColorStop(0, 'rgba(8, 6, 4, 0)');
    light.addColorStop(1, `rgba(8, 6, 4, ${dark})`);
    g.fillStyle = light;
    g.fillRect(0, Math.max(0, surface), w, h);
  }
}

/** Adds the chips a dug block throws off (and sparks, for an ore). */
export function burst(scene: Scene, x: number, y: number, ground: 'grass' | 'dirt' | 'stone', ore: PinecraftOre | null, now: number): void {
  const chip = ground === 'stone' ? ['#77787b', '#5a5b5f', '#8d8e91'] : ['#6b4f35', '#533c28', '#7d5d40'];
  if (ground === 'grass') chip.push('#6cc04a');
  const add = (color: string, speed: number, size: number, life: number): void => {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.5 + Math.random());
    scene.particles.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 2, size, color, born: now, life });
  };
  for (let k = 0; k < 12; k++) add(chip[k % chip.length] as string, 3, 0.09 + Math.random() * 0.06, 500 + Math.random() * 250);
  if (ore) {
    const { gem, shine } = ORE_COLOR[ore];
    for (let k = 0; k < 14; k++) add(k % 2 ? gem : shine, 4.5, 0.07 + Math.random() * 0.05, 700 + Math.random() * 300);
  }
}

/** Moves the particles on by `dt` ms, and forgets the ones that are gone. */
export function stepParticles(scene: Scene, dt: number, now: number): void {
  const t = dt / 1000;
  scene.particles = scene.particles.filter((p) => now - p.born < p.life);
  for (const p of scene.particles) {
    p.vy += 14 * t;
    p.x += p.vx * t;
    p.y += p.vy * t;
  }
}
