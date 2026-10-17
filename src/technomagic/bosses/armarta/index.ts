import { Vector3, type Object3D, type Scene } from 'three';
import { ARMARTA_ASSETS } from '../../assets';
import type { BossFx } from '../../fight/fx';
import { ARMARTA } from '../../sim/bosses/armarta';
import type { Boss, BossLook } from '../boss';
import { dragonFx } from '../dragon/fx';
import { loadDragon } from '../dragon/model';
import { ASHEN_NOX } from '../dragon/scenery';

/* Armarta on the field: the dragons' body (../dragon/) in its black, breathing black flame, under Ashen Nox. */

const DARK = 0x8a4dff;
const PALE = 0xe0c8ff;
const STONE = 0xb8b2a6;
const at = new Vector3();

export const ARMARTA_LOOK: BossLook = {
  assets: ARMARTA_ASSETS,
  stands: { x: 8, turn: -1.1 },
  reach: { hit: [-2.4, 3.6, 2.4], feet: [-1.2, 0, 1] },
  skills: ['breath', 'eclipse'],
  scenery: ASHEN_NOX,
};

export const loadArmarta = (scene: Scene, bright: Object3D): Promise<Boss> => loadDragon({ assets: ARMARTA_ASSETS, plans: ARMARTA.plans, breath: { core: PALE, edge: DARK } }, scene, bright);

export const ARMARTA_FX: BossFx = dragonFx(DARK, PALE, {
  // Its gaze on a hero: a ray from it, and the hero turned to stone.
  gaze({ magic, bossHit, place, head }, [hero]) {
    if (hero === undefined) return;
    magic.ray(bossHit.clone().setY(bossHit.y + 3), head(hero, at), DARK, 0.6, 1.4);
    magic.beam(place(hero, at), STONE, 0.9, 1.2);
  },
  // The Black Sun's light on the field.
  eclipse({ magic, bossFeet, place }, heroes) {
    magic.ring(bossFeet, DARK, 32, 1);
    magic.ring(bossFeet, PALE, 20, 0.7);
    for (const hero of heroes) magic.beam(place(hero, at), DARK, 0.7, 1.3);
  },
});
