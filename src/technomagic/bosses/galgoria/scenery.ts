import { KEPT } from '../../assets';
import type { Scenery } from '../../engine/stage';

/**
 * Where Galgoria is fought, as in the game: a grey wasteland. Painted once by scripts/wasteland.py (whose sheet and haze
 * these are: a change to one is a change to the other), and kept with the page.
 */
export const WASTELAND: Scenery = {
  backdrop: { url: `${KEPT}/scenery/wasteland/backdrop.jpg`, z: -22, left: -60, right: 60, bottom: -1, top: 35 },
  ground: { url: `${KEPT}/scenery/wasteland/ground.jpg`, tile: 14 },
  haze: { color: 0x47464a, near: 7, far: 22 },
};
