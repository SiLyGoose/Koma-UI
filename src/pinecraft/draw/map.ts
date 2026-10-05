import type { WorldMap } from '../protocol';
import { ORE_COLOR } from '../textures';
import { ORE_OF } from './scene';

/** The map's colour for each letter (see ../protocol.ts); blocks not seen yet aren't drawn. */
const MAP_COLOR: Readonly<Record<string, string>> = {
  '.': '#b3682f',
  d: '#5b3f2b',
  s: '#6d7278',
  b: '#2c3642',
  ...Object.fromEntries(Object.entries(ORE_OF).map(([letter, ore]) => [letter, ORE_COLOR[ore].gem])),
};

/**
 * Draws the map on `g` (`w` by `h` CSS pixels): everything uncovered, a square a block, as big as
 * fits (up to 16 px a block), in the middle. The start (0,0) is outlined, and the character, at `you`,
 * is a red square.
 */
export function drawMap(g: CanvasRenderingContext2D, map: WorldMap, w: number, h: number, you: { x: number; y: number }, spawn: { x: number; y: number }): void {
  // Clear: the map's page colour (../pinecraft.css) shows round it.
  g.clearRect(0, 0, w, h);
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
