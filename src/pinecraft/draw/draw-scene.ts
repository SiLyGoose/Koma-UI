import { crack, keysPicture, texture, type BlockTexture } from './textures';
import { character } from './character';
import { cellAt, isOpenCell, ORE_OF, type Scene } from './scene';

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

/** How long how to play takes to fade away. */
const KEYS_FADE_MS = 600;

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
      const px = (x - cam.x) * s;
      const py = (y - cam.y) * s;
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
      const tex = texture(textureOf(c));
      if (tex) g.drawImage(tex, px, py, s + 0.5, s + 0.5);
      const dug = scene.digging;
      if (dug && dug.x === x && dug.y === y) {
        const cracks = crack((now - dug.since) / dug.takes);
        if (cracks) g.drawImage(cracks, px, py, s + 0.5, s + 0.5);
      }
    }
  }

  // How to play, in the ground under where the character starts: `keysGap` blocks below the row 2 under
  // the spawn.
  const keys = keysPicture();
  const shown = scene.keysGoneAt === null ? 1 : 1 - (now - scene.keysGoneAt) / KEYS_FADE_MS;
  if (keys && scene.state.spawn && shown > 0) {
    const kw = 3 * s;
    const kh = (kw * keys.height) / keys.width;
    g.globalAlpha = 0.92 * Math.min(1, shown);
    g.drawImage(keys, (scene.state.spawn.x + 0.5 - cam.x) * s - kw / 2, (scene.state.spawn.y + 2 + scene.keysGap - cam.y) * s, kw, kh);
    g.globalAlpha = 1;
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
  character(g, (scene.character.x - cam.x) * s, (scene.character.y - cam.y) * s, s, scene.facing, phase, scene.swing?.dir ?? null, now, scene.state.pickaxe ?? 'wood', scene.state.outfit);
}
