import type { Object3D, Scene } from 'three';
import { ASCALON_ASSETS } from '../../assets';
import { ASCALON } from '../../sim/bosses/ascalon';
import type { Boss, BossLook } from '../boss';
import { loadKrBody } from '../kr-body';
import { ascalonFx } from './fx';
import { SANCTUARY_FIELD } from './scenery';

/*
 * Ascalon on the field: King's Raid's Raid.Tech.Ascalon, one body on one skeleton (../kr-body.ts), moved by the game's own clips
 * for him (his idle, each of his attacks fitted to how the fight times it, coming in, falling). He is away as the fight
 * begins (the four waves of his beasts before him: the page hides him while the fight has him away) and comes in for the
 * fifth (boss-return: arrive()). What his fx play later in a skill is moved on with him (./fx.ts). He is only drawn: when he
 * attacks, and what comes of each blow, is the fight's sim's (../../sim/bosses/ascalon/).
 */

/**
 * How big he is: his model's size in King's Raid's units, as the dragons and Divine Punishment's bosses are drawn (his wave
 * gives him no scale of its own); at the heroes' SCALE, as Siegfried is, he would hide the field.
 */
const SIZE = 1;

/** His files, and where he stands: where the bosses stand; a hero's cut reaches his chest. */
export const ASCALON_LOOK: BossLook = {
  assets: ASCALON_ASSETS,
  stands: { x: 7, turn: -1.1 },
  reach: { hit: [-0.8, 2.4, 0.3], feet: [-0.4, 0, 0.3] },
  skills: ['barrage', 'warp', 'destruction'],
  scenery: SANCTUARY_FIELD,
};

export async function loadAscalon(_scene: Scene, _bright: Object3D): Promise<Boss> {
  const body = await loadKrBody(ASCALON_ASSETS, ASCALON, SIZE);
  return {
    ...body,
    // (Coming in after his waves: seen again, as he arrives.)
    arrive() {
      body.root.visible = true;
      body.arrive?.();
    },
    reset() {
      ascalonFx.clear();
      body.reset?.();
    },
    update(now, dt) {
      body.update(now, dt);
      ascalonFx.update(dt);
    },
  };
}
