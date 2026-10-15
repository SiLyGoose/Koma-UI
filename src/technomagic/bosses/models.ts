import type { Scene } from 'three';
import type { BossFx } from '../fight/fx';
import type { Boss, BossLook } from './boss';
import { GALGORIA_FX } from './galgoria/fx';
import { GALGORIA_LOOK, loadGalgoria } from './galgoria/model';

/**
 * Each boss as the page draws it, by its id (../sim/bosses/ lists what each does): how it looks and where it stands,
 * its body (read and stood up, what it throws drawn in `scene`), and what is drawn for its skills.
 */
export const BOSS_VIEWS: Readonly<Record<string, { look: BossLook; load(scene: Scene): Promise<Boss>; fx: BossFx }>> = {
  galgoria: { look: GALGORIA_LOOK, load: loadGalgoria, fx: GALGORIA_FX },
};
