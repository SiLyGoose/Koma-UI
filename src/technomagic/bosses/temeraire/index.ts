import type { Object3D, Scene } from 'three';
import { TEMERAIRE_ASSETS } from '../../assets';
import type { BossFx } from '../../fight/fx';
import { TEMERAIRE } from '../../sim/bosses/temeraire';
import type { Boss, BossLook } from '../boss';
import { dragonFx } from '../dragon/fx';
import { loadDragon } from '../dragon/model';
import { DRAGIA } from '../dragon/scenery';

/* Temeraire on the field: the dragons' body (../dragon/) in its red, breathing fire, in Dragia. */

const FIRE = 0xff6a1f;
const GOLD = 0xffc35a;

/** Where it stands: right of the middle as Galgoria does, further back for its tail. */
export const TEMERAIRE_LOOK: BossLook = {
  assets: TEMERAIRE_ASSETS,
  stands: { x: 8, turn: -1.1 },
  reach: { hit: [-2.4, 3.6, 2.4], feet: [-1.2, 0, 1] },
  skills: ['breath', 'blessing', 'eruption'],
  scenery: DRAGIA,
};

export const loadTemeraire = (scene: Scene, bright: Object3D): Promise<Boss> => loadDragon({ assets: TEMERAIRE_ASSETS, plans: TEMERAIRE.plans, breath: { core: GOLD, edge: FIRE } }, scene, bright);

export const TEMERAIRE_FX: BossFx = dragonFx(FIRE, GOLD, {
  // Its flame called up: a column of fire on it, and the heat going out over the field.
  blessing({ magic, bossFeet, place }, heroes) {
    magic.beam(bossFeet, FIRE, 1.2, 3);
    magic.ring(bossFeet, GOLD, 24, 0.9);
    for (const hero of heroes) magic.ring(place(hero, bossFeet.clone()), FIRE, 3, 0.4);
  },
});
