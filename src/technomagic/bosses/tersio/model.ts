import type { Object3D, Scene } from 'three';
import { TERSIO_ASSETS } from '../../assets';
import { APOCALYPSION } from '../../sim/bosses/divine/apocalypsion';
import { APOCALYPSION_FIELD } from '../apocalypsion/scenery';
import type { Boss, BossLook } from '../boss';
import { loadKrBody } from '../kr-body';

/*
 * Tersio on the field: King's Raid's Boss.Tersio (Divine Punishment's creature 60001), one body, moved by the game's own
 * clips for his stand-in kit's attacks (../../sim/bosses/divine/apocalypsion.ts). He is fought from the bridge of
 * Apocalypsion's field, a dragon too great for it, standing below its end (KR's wave puts him 35 m on from the heroes'
 * ground: here nearer, for the camera). At his 1% he is gone, Apocalypsion in his place (../apocalypsion/).
 */

/** How big he is: as King's Raid has him (his creature's and his wave's scale both 1), in its units, as the dragons are. */
const SIZE = 0.45;

/** His files, and where he stands: beyond the bridge's end, side-on; a hero's cut reaches his chest. */
export const TERSIO_LOOK: BossLook = {
  assets: TERSIO_ASSETS,
  stands: { x: 17, turn: -1.3 },
  reach: { hit: [-4, 6, 1], feet: [-3, 0, 1] },
  skills: ['breath', 'annihilation', 'door'],
  scenery: APOCALYPSION_FIELD,
};

export const loadTersio = (_scene: Scene, _bright: Object3D): Promise<Boss> => loadKrBody(TERSIO_ASSETS, APOCALYPSION, SIZE);
