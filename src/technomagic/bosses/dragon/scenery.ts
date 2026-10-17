import { KEPT } from '../../assets';
import type { Scenery } from '../../engine/stage';

/**
 * Where each dragon is fought, as King's Raid names their lairs: Dragia, the mountain of red lava (Temeraire); Turandana,
 * the land of ice (Scalaxia); Grimvine, the swamp of death (Zyrrkinoth); Ashen Nox, the Black Sun (Armarta). Painted once
 * by scripts/lairs.py (whose sheet and hazes these are: a change to one is a change to the other), and kept with the page.
 */
const lair = (folder: string, haze: number): Scenery => ({
  backdrop: { url: `${KEPT}/scenery/${folder}/backdrop.webp`, z: -22, left: -60, right: 60, bottom: -1, top: 35 },
  ground: { url: `${KEPT}/scenery/${folder}/ground.webp`, tile: 14 },
  haze: { color: haze, near: 7, far: 22 },
});

export const DRAGIA = lair('dragia', 0x3a1f1a);
export const TURANDANA = lair('turandana', 0x9aa9b8);
export const GRIMVINE = lair('grimvine', 0x2c3626);
export const ASHEN_NOX = lair('ashen-nox', 0x1d1a22);
