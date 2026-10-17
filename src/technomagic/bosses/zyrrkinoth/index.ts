import { Vector3, type Object3D, type Scene } from 'three';
import { ZYRRKINOTH_ASSETS } from '../../assets';
import type { BossFx } from '../../fight/fx';
import { ZYRRKINOTH } from '../../sim/bosses/zyrrkinoth';
import type { Boss, BossLook } from '../boss';
import { dragonFx } from '../dragon/fx';
import { loadDragon } from '../dragon/model';
import { GRIMVINE } from '../dragon/scenery';

/* Zyrrkinoth on the field: the dragons' body (../dragon/) in its green, breathing venom, in Grimvine. */

const VENOM = 0x6dff4a;
const BILE = 0xd8ff6a;
const STONE = 0xb8b2a6;
const at = new Vector3();

export const ZYRRKINOTH_LOOK: BossLook = {
  assets: ZYRRKINOTH_ASSETS,
  stands: { x: 8, turn: -1.1 },
  reach: { hit: [-2.4, 3.6, 2.4], feet: [-1.2, 0, 1] },
  skills: ['breath'],
  scenery: GRIMVINE,
};

export const loadZyrrkinoth = (scene: Scene, bright: Object3D): Promise<Boss> => loadDragon({ assets: ZYRRKINOTH_ASSETS, plans: ZYRRKINOTH.plans, breath: { core: BILE, edge: VENOM } }, scene, bright);

export const ZYRRKINOTH_FX: BossFx = dragonFx(VENOM, BILE, {
  // Its tail lashing the heroes back.
  lash({ magic, place }, heroes) {
    for (const hero of heroes) magic.ring(place(hero, at), VENOM, 4.5, 0.45);
  },
  // Turned to stone: a grey column on them.
  petrify({ magic, place }, [hero]) {
    if (hero === undefined) return;
    magic.beam(place(hero, at), STONE, 0.8, 1.2);
    magic.ring(at, STONE, 4, 0.6);
  },
});
