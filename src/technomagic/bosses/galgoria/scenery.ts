import { KEPT, LOCAL } from '../../assets';
import type { Scenery } from '../../engine/stage';

/**
 * Where Galgoria is fought, as in the game: a grey wasteland. Painted once by scripts/wasteland.py (whose sheet and haze
 * these are: a change to one is a change to the other), and kept with the page.
 */
export const WASTELAND: Scenery = {
  backdrop: { url: `${KEPT}/scenery/wasteland/backdrop.webp`, z: -22, left: -60, right: 60, bottom: -1, top: 35 },
  ground: { url: `${KEPT}/scenery/wasteland/ground.webp`, tile: 14 },
  haze: { color: 0x47464a, near: 7, far: 22 },
  // King's Raid's own map of its raid (Raid.GargoriaField1).
  map: { folder: `${LOCAL}/bosses/galgoria/map`, at: [48, 0, -5], turn: Math.PI, floor: 0x201a2c, grounded: true, apron: true },
};
