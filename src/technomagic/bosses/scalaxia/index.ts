import { Vector3, type Object3D, type Scene } from 'three';
import { SCALAXIA_ASSETS } from '../../assets';
import type { BossFx } from '../../fight/fx';
import { SCALAXIA } from '../../sim/bosses/scalaxia';
import type { Boss, BossLook } from '../boss';
import { dragonFx } from '../dragon/fx';
import { loadDragon } from '../dragon/model';
import { TURANDANA } from '../dragon/scenery';

/* Scalaxia on the field: the dragons' body (../dragon/) in its blue, breathing frost, in Turandana; its pillars of ice rise as it storms. */

const ICE = 0x7fd6ff;
const WHITE = 0xe8f8ff;
const at = new Vector3();

export const SCALAXIA_LOOK: BossLook = {
  assets: SCALAXIA_ASSETS,
  stands: { x: 8, turn: -1.1 },
  reach: { hit: [-2.4, 3.6, 2.4], feet: [-1.2, 0, 1] },
  skills: ['breath', 'storm'],
  scenery: TURANDANA,
};

export const loadScalaxia = (scene: Scene, bright: Object3D): Promise<Boss> => loadDragon({ assets: SCALAXIA_ASSETS, plans: SCALAXIA.plans, breath: { core: WHITE, edge: ICE } }, scene, bright);

export const SCALAXIA_FX: BossFx = dragonFx(ICE, WHITE, {
  // Its ice from the air, on every hero.
  storm({ magic, place }, heroes) {
    for (const hero of heroes) magic.beam(place(hero, at), ICE, 0.5, 0.9);
  },
  // Down on them: every hero frozen.
  glacial({ magic, bossFeet, place }, heroes) {
    magic.ring(bossFeet, ICE, 28, 0.8);
    for (const hero of heroes) {
      place(hero, at);
      magic.ring(at, WHITE, 4, 0.6);
      magic.crystals(at.clone().setY(3), at.clone());
    }
  },
});
